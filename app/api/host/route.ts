import { NextRequest, NextResponse } from "next/server";
import {
  getMeta,
  setMeta,
  getParticipants,
  getParticipantCount,
  getTotalAnswers,
  getVotes,
  getWinners,
  awardPoints,
  recordWinner,
  clearRoom,
  resetAnswers,
  resetVotes,
  removePlayer,
  hashPin,
  checkPin,
  ranked,
  isGameMode,
  GAME_LABELS,
  POLL_POINTS,
  type GameMode,
  type RoomMeta,
} from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { CLUE_ROUNDS } from "@/lib/cluerace";
import { POLL_PAIRS } from "@/lib/pollbattle";

export const dynamic = "force-dynamic";

const ACTIVITY = "Comic Con United — Live Games";
const EVENT_NAME = "Delhi Comic Con 2026";

function bankLength(mode: GameMode): number {
  return mode === "quiz" ? QUESTIONS.length : mode === "clue" ? CLUE_ROUNDS.length : POLL_PAIRS.length;
}

async function exportRows() {
  const participants = await getParticipants();
  return ranked(participants).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    phone: p.phone,
    score: p.score,
  }));
}

/** Reset the per-item stores for the item about to start. */
async function resetItem(meta: RoomMeta, idx: number): Promise<void> {
  if (meta.mode === "poll") await resetVotes(idx);
  else await resetAnswers(meta.mode, idx);
}

/**
 * Finish the active game: phase → finished, and the current #1 player is
 * recorded as that game's winner on the persistent winners board.
 */
async function finishGame(meta: RoomMeta): Promise<RoomMeta> {
  const next: RoomMeta = { ...meta, phase: "finished", pausedAt: null, qStartedAt: null };
  await setMeta(next);
  const top = ranked(await getParticipants())[0];
  if (top) {
    await recordWinner({
      game: meta.mode,
      gameLabel: GAME_LABELS[meta.mode],
      name: top.name,
      phone: top.phone,
      score: top.score,
      at: Date.now(),
    });
  }
  return next;
}

/** Shared advance used by "next" (from reveal) and "skip" (from anywhere live). */
async function advance(meta: RoomMeta): Promise<RoomMeta> {
  if (meta.qIndex + 1 >= bankLength(meta.mode)) {
    return finishGame(meta);
  }
  const next: RoomMeta = {
    ...meta,
    pausedAt: null,
    clueStage: 0,
    itemAwarded: false,
    qIndex: meta.qIndex + 1,
    phase: "question",
    qStartedAt: Date.now(),
    questionsPlayed: meta.questionsPlayed + 1,
  };
  await resetItem(next, next.qIndex);
  await setMeta(next);
  return next;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const pin = String(body.pin || "");
  const meta = await getMeta();

  // --- first-use PIN setup: only while no PIN exists ---
  if (action === "setup") {
    if (meta.pinHash !== null) {
      return NextResponse.json({ ok: false, error: "PIN pehle se set hai. Wahi PIN use karo." }, { status: 409 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: "PIN 4–6 digit ka hona chahiye." }, { status: 400 });
    }
    await setMeta({ ...meta, pinHash: hashPin(pin) });
    return NextResponse.json({ ok: true, message: "Host PIN set ho gaya. Ise yaad rakho — yahi admin ki chaabi hai." });
  }

  // --- everything below needs the correct PIN ---
  if (!checkPin(meta, pin)) {
    return NextResponse.json({ ok: false, error: "Galat PIN." }, { status: 403 });
  }

  switch (action) {
    case "verify": {
      const participants = await getParticipants();
      return NextResponse.json({
        ok: true,
        phase: meta.phase,
        paused: meta.pausedAt != null,
        mode: meta.mode,
        modeLabel: GAME_LABELS[meta.mode],
        participantCount: participants.length,
        qIndex: meta.qIndex,
        totalQuestions: bankLength(meta.mode),
        totalItems: bankLength(meta.mode),
        clueStage: meta.clueStage,
        participants: ranked(participants).map((p) => ({ id: p.id, name: p.name, phone: p.phone, score: p.score })),
      });
    }

    case "setMode": {
      if (meta.phase !== "lobby") {
        return NextResponse.json({ ok: false, error: "Game sirf lobby me badla ja sakta hai — pehle room clear karo." }, { status: 409 });
      }
      if (!isGameMode(body.mode)) {
        return NextResponse.json({ ok: false, error: "Galat game." }, { status: 400 });
      }
      const next: RoomMeta = { ...meta, mode: body.mode, qIndex: -1, clueStage: 0, itemAwarded: false, qStartedAt: null };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, mode: next.mode });
    }

    case "start": {
      if ((await getParticipantCount()) === 0) {
        return NextResponse.json({ ok: false, error: "Pehle players ko join karne do." }, { status: 409 });
      }
      const base: RoomMeta = { ...meta, clueStage: 0, itemAwarded: false };
      await resetItem(base, 0);
      const next: RoomMeta = {
        ...base,
        phase: "question",
        qIndex: 0,
        qStartedAt: Date.now(),
        pausedAt: null,
        questionsPlayed: 1,
      };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, qIndex: next.qIndex, mode: next.mode });
    }

    case "pause": {
      if (meta.phase !== "question") return NextResponse.json({ ok: false, error: "Pause sirf live item ke dauraan ho sakta hai." }, { status: 409 });
      if (meta.pausedAt != null) return NextResponse.json({ ok: false, error: "Game pehle se paused hai." }, { status: 409 });
      const next = { ...meta, pausedAt: Date.now() };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, paused: true });
    }

    case "resume": {
      if (meta.pausedAt == null || meta.qStartedAt == null) {
        return NextResponse.json({ ok: false, error: "Game paused nahi hai." }, { status: 409 });
      }
      // Shift the item start forward by the paused duration, so players
      // keep exactly the seconds they had left when the host paused.
      const next = { ...meta, qStartedAt: meta.qStartedAt + (Date.now() - meta.pausedAt), pausedAt: null };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, paused: false });
    }

    case "nextClue": {
      if (meta.mode !== "clue" || meta.phase !== "question") {
        return NextResponse.json({ ok: false, error: "Agla clue sirf Clue Race ke live round me milta hai." }, { status: 409 });
      }
      if (meta.clueStage >= 2) {
        return NextResponse.json({ ok: false, error: "Teeno clue dikh chuke hain — ab reveal karo." }, { status: 409 });
      }
      const next = { ...meta, clueStage: meta.clueStage + 1 };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, clueStage: next.clueStage });
    }

    case "reveal": {
      if (meta.phase !== "question") return NextResponse.json({ ok: false, error: "Koi live item nahi hai." }, { status: 409 });
      let next: RoomMeta = { ...meta, phase: "reveal" as const, pausedAt: null };
      // Poll Battle closes here: pay the majority side, exactly once.
      if (meta.mode === "poll" && !meta.itemAwarded) {
        const votes = await getVotes(meta.qIndex);
        let a = 0;
        let b = 0;
        for (const v of Object.values(votes)) {
          if (v === 0) a++;
          else b++;
        }
        if (a !== b) {
          const winSide = a > b ? 0 : 1;
          for (const [pid, side] of Object.entries(votes)) {
            if (side === winSide) await awardPoints(pid, POLL_POINTS);
          }
        }
        next = { ...next, itemAwarded: true };
      }
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase });
    }

    case "next": {
      if (meta.phase !== "reveal") return NextResponse.json({ ok: false, error: "Pehle reveal karo." }, { status: 409 });
      const next = await advance(meta);
      return NextResponse.json({ ok: true, phase: next.phase, qIndex: next.qIndex });
    }

    case "skip": {
      if (meta.phase !== "question" && meta.phase !== "reveal") {
        return NextResponse.json({ ok: false, error: "Skip karne ke liye koi item live nahi hai." }, { status: 409 });
      }
      // Answers/votes already in keep what they scored; the skipped item
      // simply awards nothing further (a skipped poll battle pays nobody).
      const next = await advance(meta);
      return NextResponse.json({ ok: true, phase: next.phase, qIndex: next.qIndex });
    }

    case "finish": {
      const next = await finishGame(meta);
      return NextResponse.json({ ok: true, phase: next.phase });
    }

    case "removePlayer": {
      const pid = String(body.pid || "");
      if (!pid) return NextResponse.json({ ok: false, error: "Player id chahiye." }, { status: 400 });
      const removed = await removePlayer(pid);
      if (!removed) return NextResponse.json({ ok: false, error: "Player nahi mila." }, { status: 404 });
      return NextResponse.json({ ok: true, participantCount: await getParticipantCount() });
    }

    case "clear": {
      const fresh = await clearRoom(meta.pinHash); // host keeps the same PIN after a clear
      return NextResponse.json({ ok: true, phase: fresh.phase });
    }

    case "export": {
      const rows = await exportRows();
      const text = rows.map((r) => `${r.rank}. ${r.name} — ${r.phone} — ${r.score} pts`).join("\n");
      const csv = ["rank,name,phone,score", ...rows.map((r) => `${r.rank},"${r.name.replace(/"/g, '""')}",${r.phone},${r.score}`)].join("\n");
      return NextResponse.json({ ok: true, rows, text, csv });
    }

    case "report": {
      const rows = await exportRows();
      const winners = await getWinners();
      return NextResponse.json({
        ok: true,
        report: {
          activity: ACTIVITY,
          event: EVENT_NAME,
          date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          totalParticipants: rows.length,
          questionsPlayed: meta.questionsPlayed,
          totalAnswers: await getTotalAnswers(),
          top3: rows.slice(0, 3),
          winners: winners.map((w) => ({
            game: w.game,
            gameLabel: w.gameLabel,
            name: w.name,
            phone: w.phone,
            score: w.score,
            at: w.at,
          })),
        },
      });
    }

    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
}
