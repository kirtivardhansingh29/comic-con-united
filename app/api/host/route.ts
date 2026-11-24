import { NextRequest, NextResponse } from "next/server";
import {
  getMeta,
  setMeta,
  getParticipants,
  getParticipantCount,
  getTotalAnswers,
  clearRoom,
  resetAnswers,
  removePlayer,
  hashPin,
  checkPin,
  ranked,
  type RoomMeta,
} from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

const ACTIVITY = "Comic Con United — Live Quiz";
const HOST_NAME = "Vitthal Diwedi";
const EVENT_NAME = "Delhi Comic Con 2026";

async function exportRows() {
  const participants = await getParticipants();
  return ranked(participants).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    phone: p.phone,
    score: p.score,
  }));
}

/** Shared advance used by "next" (from reveal) and "skip" (from anywhere live). */
async function advance(meta: RoomMeta): Promise<RoomMeta> {
  const next: RoomMeta = { ...meta, pausedAt: null };
  if (meta.qIndex + 1 >= QUESTIONS.length) {
    next.phase = "finished";
    next.qStartedAt = null;
  } else {
    next.qIndex = meta.qIndex + 1;
    next.phase = "question";
    next.qStartedAt = Date.now();
    next.questionsPlayed += 1;
    await resetAnswers(next.qIndex);
  }
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
        participantCount: participants.length,
        qIndex: meta.qIndex,
        totalQuestions: QUESTIONS.length,
        participants: ranked(participants).map((p) => ({ id: p.id, name: p.name, phone: p.phone, score: p.score })),
      });
    }

    case "start": {
      if ((await getParticipantCount()) === 0) {
        return NextResponse.json({ ok: false, error: "Pehle players ko join karne do." }, { status: 409 });
      }
      await resetAnswers(0);
      const next: RoomMeta = {
        ...meta,
        phase: "question",
        qIndex: 0,
        qStartedAt: Date.now(),
        pausedAt: null,
        questionsPlayed: 1,
      };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, qIndex: next.qIndex });
    }

    case "pause": {
      if (meta.phase !== "question") return NextResponse.json({ ok: false, error: "Pause sirf live sawal ke dauraan ho sakta hai." }, { status: 409 });
      if (meta.pausedAt != null) return NextResponse.json({ ok: false, error: "Quiz pehle se paused hai." }, { status: 409 });
      const next = { ...meta, pausedAt: Date.now() };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, paused: true });
    }

    case "resume": {
      if (meta.pausedAt == null || meta.qStartedAt == null) {
        return NextResponse.json({ ok: false, error: "Quiz paused nahi hai." }, { status: 409 });
      }
      // Shift the question start forward by the paused duration, so players
      // keep exactly the seconds they had left when the host paused.
      const next = { ...meta, qStartedAt: meta.qStartedAt + (Date.now() - meta.pausedAt), pausedAt: null };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase, paused: false });
    }

    case "reveal": {
      if (meta.phase !== "question") return NextResponse.json({ ok: false, error: "Koi live sawal nahi hai." }, { status: 409 });
      const next = { ...meta, phase: "reveal" as const, pausedAt: null };
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
        return NextResponse.json({ ok: false, error: "Skip karne ke liye koi sawal live nahi hai." }, { status: 409 });
      }
      // Answers already submitted keep the points they scored at submission;
      // the skipped question simply awards nothing further.
      const next = await advance(meta);
      return NextResponse.json({ ok: true, phase: next.phase, qIndex: next.qIndex });
    }

    case "finish": {
      const next = { ...meta, phase: "finished" as const, pausedAt: null };
      await setMeta(next);
      return NextResponse.json({ ok: true, phase: next.phase });
    }

    case "removePlayer": {
      const pid = String(body.pid || "");
      if (!pid) return NextResponse.json({ ok: false, error: "Player id chahiye." }, { status: 400 });
      const removed = await removePlayer(pid, Math.max(meta.qIndex, meta.questionsPlayed - 1));
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
      return NextResponse.json({
        ok: true,
        report: {
          activity: ACTIVITY,
          host: HOST_NAME,
          event: EVENT_NAME,
          date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          totalParticipants: rows.length,
          questionsPlayed: meta.questionsPlayed,
          totalAnswers: await getTotalAnswers(),
          top3: rows.slice(0, 3),
        },
      });
    }

    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
}
