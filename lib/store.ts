import { Redis } from "@upstash/redis";
import { createHash, randomUUID } from "crypto";

export const QUESTION_MS = 20000; // 20 second answer window
export const MAX_PARTICIPANTS = 60;

export type Phase = "lobby" | "question" | "reveal" | "finished";

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

export interface RoomState {
  phase: Phase;
  pinHash: string | null;
  participants: Participant[];
  qIndex: number; // -1 = no question running
  qStartedAt: number | null;
  answers: Record<string, AnswerRec>; // current question only, keyed by pid
  totalAnswers: number; // across the whole game
  questionsPlayed: number;
  createdAt: number;
}

const KEY = "ccu:room:v1";
const TTL_SECONDS = 60 * 60 * 24; // 24h

export function freshState(): RoomState {
  return {
    phase: "lobby",
    pinHash: null,
    participants: [],
    qIndex: -1,
    qStartedAt: null,
    answers: {},
    totalAnswers: 0,
    questionsPlayed: 0,
    createdAt: Date.now(),
  };
}

// --- Storage backend: Upstash Redis when configured, in-memory otherwise ---
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const mem: { state: RoomState | null } = { state: null };

export async function loadState(): Promise<RoomState> {
  if (redis) {
    const s = await redis.get<RoomState>(KEY);
    return s ?? freshState();
  }
  return mem.state ?? freshState();
}

export async function saveState(s: RoomState): Promise<void> {
  if (redis) {
    await redis.set(KEY, s, { ex: TTL_SECONDS });
  } else {
    mem.state = s;
  }
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(`ccu:${pin}`).digest("hex");
}

export function checkPin(state: RoomState, pin: string): boolean {
  return state.pinHash !== null && state.pinHash === hashPin(pin);
}

export function newId(): string {
  return randomUUID();
}

/** Leaderboard order: score desc, then earliest joiner first. */
export function ranked(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
}
