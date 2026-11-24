import { NextRequest, NextResponse } from "next/server";
import { getMeta, getParticipant, submitAnswer, CLUE_POINTS, QUESTION_MS } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { CLUE_ROUNDS } from "@/lib/cluerace";

export const dynamic = "force-dynamic";

// Handles the two answer-based games. Scoring is computed here, on the
// server — the correct option is never returned before the reveal phase.
//  - Quiz: correct = 600 base + up to 400 speed bonus inside the 20s window.
//  - Clue Race: correct = CLUE_POINTS[stage] (1000 / 700 / 400) — the earlier
//    the clue stage the player locks at, the more they score. No time window.
// Poll Battle votes go through /api/vote instead.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pid = String(body.pid || "");
  const choice = Number(body.choice);

  const meta = await getMeta();
  if (meta.mode === "poll") {
    return NextResponse.json({ ok: false, error: "Ye Poll Battle hai — vote /api/vote se jaata hai." }, { status: 409 });
  }
  if (meta.phase !== "question" || meta.qIndex < 0 || !meta.qStartedAt) {
    return NextResponse.json({ ok: false, error: "Abhi koi sawal live nahi hai." }, { status: 409 });
  }
  if (meta.pausedAt != null) {
    return NextResponse.json({ ok: false, error: "Game paused hai — host ke resume karne ka wait karo." }, { status: 409 });
  }
  const me = await getParticipant(pid);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Player nahi mila — dobara join karo." }, { status: 404 });
  }

  const now = Date.now();
  let points = 0;
  let correct = false;

  if (meta.mode === "clue") {
    const round = CLUE_ROUNDS[meta.qIndex];
    if (!round) {
      return NextResponse.json({ ok: false, error: "Round nahi mila." }, { status: 409 });
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= round.options.length) {
      return NextResponse.json({ ok: false, error: "Galat option." }, { status: 400 });
    }
    correct = choice === round.correct;
    const stage = Math.min(Math.max(meta.clueStage, 0), CLUE_POINTS.length - 1);
    points = correct ? CLUE_POINTS[stage] : 0;
  } else {
    const q = QUESTIONS[meta.qIndex];
    if (!q) {
      return NextResponse.json({ ok: false, error: "Sawal nahi mila." }, { status: 409 });
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) {
      return NextResponse.json({ ok: false, error: "Galat option." }, { status: 400 });
    }
    const elapsed = now - meta.qStartedAt;
    if (elapsed > QUESTION_MS + 1500) {
      // small grace for network lag; after that the window is closed
      return NextResponse.json({ ok: false, error: "Time khatam — jawab late pahuncha." }, { status: 409 });
    }
    correct = choice === q.correct;
    const speedBonus = correct ? Math.round(400 * Math.max(0, 1 - elapsed / QUESTION_MS)) : 0;
    points = correct ? 600 + speedBonus : 0;
  }

  // HSETNX inside submitAnswer is the lock: a duplicate submission from the
  // same player loses the race atomically and is rejected here.
  const added = await submitAnswer(meta.mode, meta.qIndex, { pid, choice, at: now, points, correct });
  if (!added) {
    return NextResponse.json({ ok: false, error: "Tumhara jawab pehle hi lock ho chuka hai." }, { status: 409 });
  }

  // Deliberately do NOT return points/correct here — reveal phase shows them.
  return NextResponse.json({ ok: true, locked: true });
}
