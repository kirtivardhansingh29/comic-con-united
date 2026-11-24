import { NextRequest, NextResponse } from "next/server";
import { getMeta, getParticipant, submitAnswer, QUESTION_MS } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

// Scoring is computed here, on the server, from the server clock:
// correct = 600 base + up to 400 speed bonus inside the 20s window.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pid = String(body.pid || "");
  const choice = Number(body.choice);

  const meta = await getMeta();
  if (meta.phase !== "question" || meta.qIndex < 0 || !meta.qStartedAt) {
    return NextResponse.json({ ok: false, error: "Abhi koi sawal live nahi hai." }, { status: 409 });
  }
  if (meta.pausedAt != null) {
    return NextResponse.json({ ok: false, error: "Quiz paused hai — host ke resume karne ka wait karo." }, { status: 409 });
  }
  const me = await getParticipant(pid);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Player nahi mila — dobara join karo." }, { status: 404 });
  }
  const q = QUESTIONS[meta.qIndex];
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) {
    return NextResponse.json({ ok: false, error: "Galat option." }, { status: 400 });
  }

  const now = Date.now();
  const elapsed = now - meta.qStartedAt;
  if (elapsed > QUESTION_MS + 1500) {
    // small grace for network lag; after that the window is closed
    return NextResponse.json({ ok: false, error: "Time khatam — jawab late pahuncha." }, { status: 409 });
  }
  const correct = choice === q.correct;
  const speedBonus = correct ? Math.round(400 * Math.max(0, 1 - elapsed / QUESTION_MS)) : 0;
  const points = correct ? 600 + speedBonus : 0;

  // HSETNX inside submitAnswer is the lock: a duplicate submission from the
  // same player loses the race atomically and is rejected here.
  const added = await submitAnswer(meta.qIndex, { pid, choice, at: now, points, correct });
  if (!added) {
    return NextResponse.json({ ok: false, error: "Tumhara jawab pehle hi lock ho chuka hai." }, { status: 409 });
  }

  // Deliberately do NOT return points/correct here — reveal phase shows them.
  return NextResponse.json({ ok: true, locked: true });
}
