import { Redis } from "@upstash/redis";
import { createHash, randomUUID } from "crypto";

export const QUESTION_MS = 20000; // 20 second answer window (quiz)
export const POLL_MS = 20000; // 20 second voting window (poll battle)
export const MAX_PARTICIPANTS = 60;

/** Points for a correct Clue Race lock, by the clue stage it was locked at. */
export const CLUE_POINTS = [1000, 700, 400];
/** Points every voter on the majority side gets when a poll battle closes. */
export const POLL_POINTS = 100;

export type Phase = "lobby" | "question" | "reveal" | "finished";

/** The three live games that share one room / join / PIN system. */
export type GameMode = "quiz" | "clue" | "poll";

export const GAME_LABELS: Record<GameMode, string> = {
  quiz: "Live Quiz",
  clue: "Clue Race — Kaun Hai Ye?",
  poll: "Janta Poll Battle",
};

export function isGameMode(v: unknown): v is GameMode {
  return v === "quiz" || v === "clue" || v === "poll";
}

export interface Participant {
  id: string;
  name: string;
  phone: string;
  score: number;
  joinedAt: number;
}

export interface AnswerRec {
  pid: string;
  choice: number;
  at: number; // server timestamp when the answer landed
  points: number;
  correct: boolean;
}

export interface RoomMeta {
  phase: Phase;
  pinHash: string | null;
  mode: GameMode; // which of the three games the room is running
  qIndex: number; // current item index within the active game's bank; -1 = none
  qStartedAt: number | null;
  pausedAt: number | null; // server timestamp when the host paused, else null
  clueStage: number; // clue mode only: 0, 1 or 2 — which clue is showing
  itemAwarded: boolean; // poll mode only: majority points for this battle paid out
  questionsPlayed: number;
  createdAt: number;
}

export function freshMeta(): RoomMeta {
  return {
    phase: "lobby",
    pinHash: null,
    mode: "quiz",
    qIndex: -1,
    qStartedAt: null,
    pausedAt: null,
    clueStage: 0,
    itemAwarded: false,
    questionsPlayed: 0,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Storage layout (v2) — split into Redis structures with atomic per-player
// writes, so concurrent joins/answers can no longer overwrite each other
// (the old single-JSON read-modify-write lost 42 of 50 simultaneous joins):
//
//   ccu:v2:meta            STRING  RoomMeta JSON (host-driven, low contention)
//   ccu:v2:participants    HASH    pid   -> {id,name,phone,joinedAt} JSON
//   ccu:v2:phones          HASH    phone -> pid        (rejoin dedupe claim)
//   ccu:v2:scores          HASH    pid   -> score      (HINCRBY at answer time)
//   ccu:v2:answers:<mode>:<i> HASH pid   -> AnswerRec JSON (HSETNX = the lock)
//   ccu:v2:votes:<i>       HASH    pid   -> 0 | 1  (poll battle side, HSETNX)
//   ccu:v2:totalAnswers    STRING  counter (INCR per accepted answer)
//   ccu:v2:winners         HASH    game  -> WinnerEntry JSON (survives clears)
// ---------------------------------------------------------------------------

const META_KEY = "ccu:v2:meta";
const PARTS_KEY = "ccu:v2:participants";
const PHONES_KEY = "ccu:v2:phones";
const SCORES_KEY = "ccu:v2:scores";
const TOTAL_KEY = "ccu:v2:totalAnswers";
const WINNERS_KEY = "ccu:v2:winners";
const answersKey = (mode: GameMode, idx: number) => `ccu:v2:answers:${mode}:${idx}`;
const votesKey = (idx: number) => `ccu:v2:votes:${idx}`;
const ALL_MODES: GameMode[] = ["quiz", "clue", "poll"];
const MAX_BANK = 30; // largest bank (quiz); used for cleanup sweeps
const MAX_BATTLES = 8; // poll bank size; used for cleanup sweeps
const TTL_SECONDS = 60 * 60 * 24; // 24h

// --- Backend abstraction: Upstash Redis when configured, in-memory otherwise.
// The in-memory backend mirrors the same semantics (including TTL expiry).

interface Backend {
  get(key: string): Promise<unknown>;
  set(key: string, val: unknown): Promise<void>;
  del(keys: string[]): Promise<void>;
  hget(key: string, field: string): Promise<unknown>;
  hset(key: string, field: string, val: unknown): Promise<void>;
  hsetnx(key: string, field: string, val: unknown): Promise<boolean>;
  hgetall(key: string): Promise<Record<string, unknown>>;
  hdel(key: string, field: string): Promise<void>;
  hlen(key: string): Promise<number>;
  hincrby(key: string, field: string, delta: number): Promise<number>;
  incr(key: string): Promise<number>;
  touch(keys: string[]): Promise<void>;
}

function parseVal(v: unknown): unknown {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

class RedisBackend implements Backend {
  constructor(private r: Redis) {}
  async get(key: string) {
    return parseVal(await this.r.get(key));
  }
  async set(key: string, val: unknown) {
    await this.r.set(key, val as never, { ex: TTL_SECONDS });
  }
  async del(keys: string[]) {
    if (keys.length) await this.r.del(...keys);
  }
  async hget(key: string, field: string) {
    return parseVal(await this.r.hget(key, field));
  }
  async hset(key: string, field: string, val: unknown) {
    await this.r.hset(key, { [field]: val });
  }
  async hsetnx(key: string, field: string, val: unknown): Promise<boolean> {
    const n = await this.r.hsetnx(key, field, val as never);
    return n === 1;
  }
  async hgetall(key: string): Promise<Record<string, unknown>> {
    const all = (await this.r.hgetall(key)) || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(all)) out[k] = parseVal(v);
    return out;
  }
  async hdel(key: string, field: string) {
    await this.r.hdel(key, field);
  }
  async hlen(key: string) {
    return this.r.hlen(key);
  }
  async hincrby(key: string, field: string, delta: number) {
    return this.r.hincrby(key, field, delta);
  }
  async incr(key: string) {
    return this.r.incr(key);
  }
  async touch(keys: string[]) {
    if (!keys.length) return;
    const pipe = this.r.pipeline();
    for (const k of keys) pipe.expire(k, TTL_SECONDS);
    await pipe.exec();
  }
}

interface MemEntry {
  v: unknown;
  exp: number;
}
interface MemHash {
  fields: Map<string, unknown>;
  exp: number;
}

class MemoryBackend implements Backend {
  private strings = new Map<string, MemEntry>();
  private hashes = new Map<string, MemHash>();

  private liveString(key: string): MemEntry | undefined {
    const e = this.strings.get(key);
    if (e && e.exp <= Date.now()) {
      this.strings.delete(key);
      return undefined;
    }
    return e;
  }
  private liveHash(key: string): MemHash | undefined {
    const h = this.hashes.get(key);
    if (h && h.exp <= Date.now()) {
      this.hashes.delete(key);
      return undefined;
    }
    return h;
  }
  private hashForWrite(key: string): MemHash {
    let h = this.liveHash(key);
    if (!h) {
      h = { fields: new Map(), exp: Date.now() + TTL_SECONDS * 1000 };
      this.hashes.set(key, h);
    }
    return h;
  }

  async get(key: string) {
    return this.liveString(key)?.v ?? null;
  }
  async set(key: string, val: unknown) {
    this.strings.set(key, { v: val, exp: Date.now() + TTL_SECONDS * 1000 });
  }
  async del(keys: string[]) {
    for (const k of keys) {
      this.strings.delete(k);
      this.hashes.delete(k);
    }
  }
  async hget(key: string, field: string) {
    return this.liveHash(key)?.fields.get(field) ?? null;
  }
  async hset(key: string, field: string, val: unknown) {
    this.hashForWrite(key).fields.set(field, val);
  }
  async hsetnx(key: string, field: string, val: unknown): Promise<boolean> {
    const h = this.hashForWrite(key);
    if (h.fields.has(field)) return false;
    h.fields.set(field, val);
    return true;
  }
  async hgetall(key: string): Promise<Record<string, unknown>> {
    const h = this.liveHash(key);
    return h ? Object.fromEntries(h.fields) : {};
  }
  async hdel(key: string, field: string) {
    this.liveHash(key)?.fields.delete(field);
  }
  async hlen(key: string) {
    return this.liveHash(key)?.fields.size ?? 0;
  }
  async hincrby(key: string, field: string, delta: number) {
    const h = this.hashForWrite(key);
    const next = Number(h.fields.get(field) ?? 0) + delta;
    h.fields.set(field, next);
    return next;
  }
  async incr(key: string) {
    const cur = Number(this.liveString(key)?.v ?? 0) + 1;
    this.strings.set(key, { v: cur, exp: Date.now() + TTL_SECONDS * 1000 });
    return cur;
  }
  async touch(keys: string[]) {
    const exp = Date.now() + TTL_SECONDS * 1000;
    for (const k of keys) {
      const s = this.strings.get(k);
      if (s) s.exp = exp;
      const h = this.hashes.get(k);
      if (h) h.exp = exp;
    }
  }
}

let backend: Backend;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  backend = new RedisBackend(
    new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  );
} else {
  backend = new MemoryBackend();
}

// --- Room meta ---------------------------------------------------------------

export async function getMeta(): Promise<RoomMeta> {
  const m = (await backend.get(META_KEY)) as RoomMeta | null;
  if (!m) return freshMeta();
  // Merge over fresh defaults so metas written before a field existed
  // (e.g. mode / clueStage) still read back complete.
  return { ...freshMeta(), ...m };
}

export async function setMeta(meta: RoomMeta): Promise<void> {
  await backend.set(META_KEY, meta);
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(`ccu:${pin}`).digest("hex");
}

export function checkPin(meta: RoomMeta, pin: string): boolean {
  return meta.pinHash !== null && meta.pinHash === hashPin(pin);
}

export function newId(): string {
  return randomUUID();
}

// --- Participants --------------------------------------------------------------

interface StoredParticipant {
  id: string;
  name: string;
  phone: string;
  joinedAt: number;
}

function withScore(rec: StoredParticipant, scores: Record<string, unknown>): Participant {
  return { ...rec, score: Number(scores[rec.id] ?? 0) };
}

export async function getParticipants(): Promise<Participant[]> {
  const [parts, scores] = await Promise.all([backend.hgetall(PARTS_KEY), backend.hgetall(SCORES_KEY)]);
  return Object.values(parts).map((v) => withScore(v as StoredParticipant, scores));
}

export async function getParticipant(pid: string): Promise<Participant | null> {
  const [rec, score] = await Promise.all([backend.hget(PARTS_KEY, pid), backend.hget(SCORES_KEY, pid)]);
  if (!rec) return null;
  return { ...(rec as StoredParticipant), score: Number(score ?? 0) };
}

export async function getParticipantCount(): Promise<number> {
  return backend.hlen(PARTS_KEY);
}

export type JoinResult =
  | { status: "joined" | "rejoined"; participant: Participant }
  | { status: "full" }
  | { status: "finished" };

/**
 * Concurrency-safe join. The phone number is claimed with HSETNX first, so
 * simultaneous joins write distinct hash fields and can never overwrite each
 * other; a same-phone race resolves to the single winning participant.
 */
export async function joinPlayer(name: string, phone: string): Promise<JoinResult> {
  const meta = await getMeta();
  if (meta.phase === "finished") return { status: "finished" };

  const existingPid = (await backend.hget(PHONES_KEY, phone)) as string | null;
  if (existingPid) {
    const rec = await getParticipant(existingPid);
    if (rec) return { status: "rejoined", participant: rec };
  }

  if ((await backend.hlen(PARTS_KEY)) >= MAX_PARTICIPANTS) return { status: "full" };

  const rec: StoredParticipant = { id: newId(), name, phone, joinedAt: Date.now() };
  const claimed = await backend.hsetnx(PHONES_KEY, phone, rec.id);
  if (!claimed) {
    // A simultaneous join with the same phone won the claim — join as them.
    const winnerPid = (await backend.hget(PHONES_KEY, phone)) as string | null;
    const winner = winnerPid ? await getParticipant(winnerPid) : null;
    if (winner) return { status: "rejoined", participant: winner };
    return { status: "full" };
  }

  await backend.hset(PARTS_KEY, rec.id, rec);
  await backend.hsetnx(SCORES_KEY, rec.id, 0);
  await backend.touch([PHONES_KEY, PARTS_KEY, SCORES_KEY]);
  return { status: "joined", participant: { ...rec, score: 0 } };
}

/** Remove a participant and everything attached to them (scores, answers, votes). */
export async function removePlayer(pid: string): Promise<boolean> {
  const rec = (await backend.hget(PARTS_KEY, pid)) as StoredParticipant | null;
  if (!rec) return false;
  await backend.hdel(PARTS_KEY, pid);
  await backend.hdel(SCORES_KEY, pid);
  if (rec.phone) await backend.hdel(PHONES_KEY, rec.phone);
  for (const mode of ALL_MODES) {
    for (let i = 0; i < MAX_BANK; i++) {
      await backend.hdel(answersKey(mode, i), pid);
    }
  }
  for (let i = 0; i < MAX_BATTLES; i++) {
    await backend.hdel(votesKey(i), pid);
  }
  return true;
}

// --- Answers -------------------------------------------------------------------

/**
 * Atomic answer submission: HSETNX on the per-item answers hash is the
 * lock (a second submission from the same player is rejected), then the score
 * is bumped with HINCRBY and the game-wide counter with INCR. No step reads
 * and rewrites another player's data.
 */
export async function submitAnswer(mode: GameMode, idx: number, rec: AnswerRec): Promise<boolean> {
  const key = answersKey(mode, idx);
  const added = await backend.hsetnx(key, rec.pid, rec);
  if (!added) return false;
  await backend.hincrby(SCORES_KEY, rec.pid, rec.points);
  await backend.incr(TOTAL_KEY);
  await backend.touch([key, SCORES_KEY, TOTAL_KEY]);
  return true;
}

export async function getAnswers(mode: GameMode, idx: number): Promise<Record<string, AnswerRec>> {
  const all = await backend.hgetall(answersKey(mode, idx));
  const out: Record<string, AnswerRec> = {};
  for (const [k, v] of Object.entries(all)) out[k] = v as AnswerRec;
  return out;
}

export async function getAnsweredCount(mode: GameMode, idx: number): Promise<number> {
  return backend.hlen(answersKey(mode, idx));
}

export async function getTotalAnswers(): Promise<number> {
  return Number((await backend.get(TOTAL_KEY)) ?? 0);
}

export async function resetAnswers(mode: GameMode, idx: number): Promise<void> {
  await backend.del([answersKey(mode, idx)]);
}

/** Bump a player's score directly (poll-battle majority payout). */
export async function awardPoints(pid: string, points: number): Promise<void> {
  if (points === 0) return;
  await backend.hincrby(SCORES_KEY, pid, points);
  await backend.touch([SCORES_KEY]);
}

// --- Poll battle votes ---------------------------------------------------------

/** Atomic vote: HSETNX is the lock — one vote per player per battle. */
export async function submitVote(battleIdx: number, pid: string, side: 0 | 1): Promise<boolean> {
  const key = votesKey(battleIdx);
  const added = await backend.hsetnx(key, pid, side);
  if (added) await backend.touch([key]);
  return added;
}

export async function getVotes(battleIdx: number): Promise<Record<string, number>> {
  const all = await backend.hgetall(votesKey(battleIdx));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(all)) out[k] = Number(v);
  return out;
}

export async function resetVotes(battleIdx: number): Promise<void> {
  await backend.del([votesKey(battleIdx)]);
}

// --- Winners board (persistent — survives room clears) --------------------------

export interface WinnerEntry {
  game: GameMode;
  gameLabel: string;
  name: string;
  phone: string;
  score: number;
  at: number; // server timestamp when the game finished
}

/** Record (or replace) the latest winner of one game. Never cleared by clearRoom. */
export async function recordWinner(entry: WinnerEntry): Promise<void> {
  await backend.hset(WINNERS_KEY, entry.game, entry);
  await backend.touch([WINNERS_KEY]);
}

/** Latest winner per game, in quiz → clue → poll order; missing games omitted. */
export async function getWinners(): Promise<WinnerEntry[]> {
  const all = await backend.hgetall(WINNERS_KEY);
  return ALL_MODES.filter((g) => all[g]).map((g) => all[g] as WinnerEntry);
}

// --- Whole room ------------------------------------------------------------------

export interface RoomSnapshot {
  meta: RoomMeta;
  participants: Participant[];
  answers: Record<string, AnswerRec>;
  answeredCount: number;
  votes: Record<string, number>;
  totalAnswers: number;
}

/** One consistent-enough read of the room for the public state endpoint. */
export async function loadRoom(): Promise<RoomSnapshot> {
  const meta = await getMeta();
  const qi = Math.max(0, meta.qIndex);
  const [participants, answers, votes, totalAnswers] = await Promise.all([
    getParticipants(),
    meta.qIndex >= 0 && meta.mode !== "poll"
      ? getAnswers(meta.mode, qi)
      : Promise.resolve({} as Record<string, AnswerRec>),
    meta.qIndex >= 0 && meta.mode === "poll"
      ? getVotes(qi)
      : Promise.resolve({} as Record<string, number>),
    getTotalAnswers(),
  ]);
  return { meta, participants, answers, answeredCount: Object.keys(answers).length, votes, totalAnswers };
}

/** Wipe the room but keep the host PIN — and keep the recorded winners. */
export async function clearRoom(pinHash: string | null): Promise<RoomMeta> {
  const keys = [META_KEY, PARTS_KEY, PHONES_KEY, SCORES_KEY, TOTAL_KEY];
  for (const mode of ALL_MODES) {
    for (let i = 0; i < MAX_BANK; i++) keys.push(answersKey(mode, i));
  }
  for (let i = 0; i < MAX_BATTLES; i++) keys.push(votesKey(i));
  await backend.del(keys);
  const fresh = freshMeta();
  fresh.pinHash = pinHash;
  await backend.set(META_KEY, fresh);
  return fresh;
}

/** Leaderboard order: score desc, then earliest joiner first. */
export function ranked(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
}

/** Milliseconds left in the current item, honouring a host pause. */
export function remainingMs(meta: RoomMeta, now: number, durationMs: number = QUESTION_MS): number {
  if (meta.qStartedAt == null) return 0;
  const end = meta.pausedAt ?? now;
  return Math.max(0, durationMs - (end - meta.qStartedAt));
}
