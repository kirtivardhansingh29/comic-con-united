import { NextRequest, NextResponse } from "next/server";
import { loadRoom, ranked, remainingMs, QUESTION_MS } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

// Public room view. The correct answer is included ONLY in the reveal /
// finished phases — during a live question it never leaves the server.
// Scores, however, are live by design: an answer is scored by the server the
// moment it lands, and the question-phase "liveLeaderboard" reflects that.
export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") || "";
  const { meta, participants, answers, answeredCount } = await loadRoom();
  const board = ranked(participants);
  const boardView = board.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }));
  const inQuestion = meta.phase === "question" || meta.phase === "reveal";
  const q = inQuestion && meta.qIndex >= 0 ? QUESTIONS[meta.qIndex] : null;
  const myAnswer = pid ? answers[pid] ?? null : null;
  const revealed = meta.phase === "reveal" || meta.phase === "finished";
  const paused = meta.pausedAt != null;

  return NextResponse.json({
    phase: meta.phase,
    paused,
    hostReady: meta.pinHash !== null,
    participantCount: participants.length,
    participants: participants.map((p) => ({ id: p.id, name: p.name })),
    question:
      q && meta.qIndex >= 0
        ? {
            index: meta.qIndex,
            total: QUESTIONS.length,
            category: q.category,
            text: q.text,
            options: q.options,
            startedAt: meta.qStartedAt,
            durationMs: QUESTION_MS,
            answeredCount,
            paused,
            remainingMs: remainingMs(meta, Date.now()),
            // revealed only after the host hits reveal:
            correctIndex: revealed ? q.correct : undefined,
          }
        : null,
    myAnswer: myAnswer
      ? {
          choice: myAnswer.choice,
          // points/correctness stay hidden until reveal:
          points: revealed ? myAnswer.points : undefined,
          correct: revealed ? myAnswer.correct : undefined,
        }
      : null,
    // Live ranking during a question: scores already include points from
    // answers scored so far in the current question (server scores at
    // submission time), so ranks move the moment a player answers.
    liveLeaderboard: meta.phase === "question" ? boardView : null,
    leaderboard: revealed ? boardView : null,
    podium: meta.phase === "finished" ? boardView.slice(0, 3) : null,
  });
}
