import { NextRequest, NextResponse } from "next/server";
import { loadState, ranked, QUESTION_MS } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

// Public room view. The correct answer is included ONLY in the reveal /
// finished phases — during a live question it never leaves the server.
export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") || "";
  const s = await loadState();
  const board = ranked(s.participants);
  const inQuestion = s.phase === "question" || s.phase === "reveal";
  const q = inQuestion && s.qIndex >= 0 ? QUESTIONS[s.qIndex] : null;
  const myAnswer = pid && s.answers[pid] ? s.answers[pid] : null;

  return NextResponse.json({
    phase: s.phase,
    hostReady: s.pinHash !== null,
    participantCount: s.participants.length,
    participants: s.participants.map((p) => ({ id: p.id, name: p.name })),
    question:
      q && s.qIndex >= 0
        ? {
            index: s.qIndex,
            total: QUESTIONS.length,
            category: q.category,
            text: q.text,
            options: q.options,
            startedAt: s.qStartedAt,
            durationMs: QUESTION_MS,
            answeredCount: Object.keys(s.answers).length,
            // revealed only after the host hits reveal:
            correctIndex: s.phase === "reveal" || s.phase === "finished" ? q.correct : undefined,
          }
        : null,
    myAnswer: myAnswer
      ? {
          choice: myAnswer.choice,
          // points/correctness stay hidden until reveal:
          points: s.phase === "reveal" || s.phase === "finished" ? myAnswer.points : undefined,
          correct: s.phase === "reveal" || s.phase === "finished" ? myAnswer.correct : undefined,
        }
      : null,
    leaderboard:
      s.phase === "reveal" || s.phase === "finished"
        ? board.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }))
        : null,
    podium:
      s.phase === "finished"
        ? board.slice(0, 3).map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }))
        : null,
  });
}
