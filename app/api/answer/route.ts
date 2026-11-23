import { NextRequest, NextResponse } from "next/server";
import { loadState, saveState, QUESTION_MS } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

// Scoring is computed here, on the server, from the server clock:
// correct = 600 base + up to 400 speed bonus inside the 20s window.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pid = String(body.pid || "");
  const choice = Number(body.choice);

  const s = await loadState();
  if (s.phase !== "question" || s.qIndex < 0 || !s.qStartedAt) {
    return NextResponse.json({ ok: false, error: "Abhi koi sawal live nahi hai." }, { status: 409 });
  }
  const me = s.participants.find((p) => p.id === pid);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Player nahi mila — dobara join karo." }, { status: 404 });
  }
  if (s.answers[pid]) {
    return NextResponse.json({ ok: false, error: "Tumhara jawab pehle hi lock ho chuka hai." }, { status: 409 });
  }
  const q = QUESTIONS[s.qIndex];
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) {
    return NextResponse.json({ ok: false, error: "Galat option." }, { status: 400 });
  }

  const now = Date.now();
  const elapsed = now - s.qStartedAt;
  if (elapsed > QUESTION_MS + 1500) {
    // small grace for network lag; after that the window is closed
    return NextResponse.json({ ok: false, error: "Time khatam — jawab late pahuncha." }, { status: 409 });
  }
  const correct = choice === q.correct;
  const speedBonus = correct ? Math.round(400 * Math.max(0, 1 - elapsed / QUESTION_MS)) : 0;
  const points = correct ? 600 + speedBonus : 0;

  s.answers[pid] = { pid, choice, at: now, points, correct };
  s.totalAnswers += 1;
  me.score += points;
  await saveState(s);

  // Deliberately do NOT return points/correct here — reveal phase shows them.
  return NextResponse.json({ ok: true, locked: true });
}
