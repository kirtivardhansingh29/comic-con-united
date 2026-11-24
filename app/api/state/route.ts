import { NextRequest, NextResponse } from "next/server";
import {
  loadRoom,
  ranked,
  remainingMs,
  getWinners,
  CLUE_POINTS,
  POLL_MS,
  QUESTION_MS,
  GAME_LABELS,
} from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { CLUE_ROUNDS } from "@/lib/cluerace";
import { POLL_PAIRS } from "@/lib/pollbattle";

export const dynamic = "force-dynamic";

// Public room view for whichever game is active. The correct answer is
// included ONLY in the reveal / finished phases — during a live item it
// never leaves the server. Scores are live by design: answers are scored
// by the server the moment they land, and the question-phase
// "liveLeaderboard" reflects that. Poll percentages are live too — that
// game is about the crowd. Winners (name + score only, no phone) are
// public so the home page board can render from the same payload shape.
export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") || "";
  const { meta, participants, answers, answeredCount, votes } = await loadRoom();
  const board = ranked(participants);
  const boardView = board.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }));
  const inItem = meta.phase === "question" || meta.phase === "reveal";
  const revealed = meta.phase === "reveal" || meta.phase === "finished";
  const paused = meta.pausedAt != null;
  const now = Date.now();
  const winners = (await getWinners()).map((w) => ({
    game: w.game,
    gameLabel: w.gameLabel,
    name: w.name,
    score: w.score,
    at: w.at,
  }));

  // --- Quiz payload ---
  const q = meta.mode === "quiz" && inItem && meta.qIndex >= 0 ? QUESTIONS[meta.qIndex] : null;
  const question = q
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
        remainingMs: remainingMs(meta, now),
        correctIndex: revealed ? q.correct : undefined,
      }
    : null;

  // --- Clue Race payload: only the clues revealed so far are sent ---
  const round = meta.mode === "clue" && inItem && meta.qIndex >= 0 ? CLUE_ROUNDS[meta.qIndex] : null;
  const stage = Math.min(Math.max(meta.clueStage, 0), 2);
  const clue = round
    ? {
        index: meta.qIndex,
        total: CLUE_ROUNDS.length,
        stage,
        clues: round.clues.slice(0, stage + 1),
        pointsNow: CLUE_POINTS[stage],
        options: round.options,
        answeredCount,
        paused,
        correctIndex: revealed ? round.correct : undefined,
      }
    : null;

  // --- Poll Battle payload: live counts/percentages are the game ---
  const pair = meta.mode === "poll" && inItem && meta.qIndex >= 0 ? POLL_PAIRS[meta.qIndex] : null;
  let votesA = 0;
  let votesB = 0;
  for (const v of Object.values(votes)) {
    if (v === 0) votesA++;
    else votesB++;
  }
  const totalVotes = votesA + votesB;
  const poll = pair
    ? {
        index: meta.qIndex,
        total: POLL_PAIRS.length,
        a: pair.a,
        b: pair.b,
        votesA,
        votesB,
        totalVotes,
        pctA: totalVotes ? Math.round((votesA / totalVotes) * 100) : 0,
        pctB: totalVotes ? Math.round((votesB / totalVotes) * 100) : 0,
        myVote: pid && votes[pid] !== undefined ? votes[pid] : null,
        startedAt: meta.qStartedAt,
        durationMs: POLL_MS,
        remainingMs: remainingMs(meta, now, POLL_MS),
        paused,
        // result only once the host closes the battle (reveal/finished):
        result: revealed ? (votesA === votesB ? "tie" : votesA > votesB ? "a" : "b") : null,
      }
    : null;

  const myAnswer = pid ? answers[pid] ?? null : null;

  return NextResponse.json({
    phase: meta.phase,
    paused,
    mode: meta.mode,
    modeLabel: GAME_LABELS[meta.mode],
    hostReady: meta.pinHash !== null,
    participantCount: participants.length,
    participants: participants.map((p) => ({ id: p.id, name: p.name })),
    question,
    clue,
    poll,
    myAnswer: myAnswer
      ? {
          choice: myAnswer.choice,
          // points/correctness stay hidden until reveal:
          points: revealed ? myAnswer.points : undefined,
          correct: revealed ? myAnswer.correct : undefined,
        }
      : null,
    // Live ranking during a live item (all three games share the scoreboard).
    liveLeaderboard: meta.phase === "question" ? boardView : null,
    leaderboard: revealed ? boardView : null,
    podium: meta.phase === "finished" ? boardView.slice(0, 3) : null,
    winners,
  });
}
