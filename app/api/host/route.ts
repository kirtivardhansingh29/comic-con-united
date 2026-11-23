import { NextRequest, NextResponse } from "next/server";
import { loadState, saveState, freshState, hashPin, checkPin, ranked } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

const ACTIVITY = "Comic Con United — Live Quiz";
const HOST_NAME = "Vitthal Diwedi";
const EVENT_NAME = "Delhi Comic Con 2026";

function exportRows(s: Awaited<ReturnType<typeof loadState>>) {
  return ranked(s.participants).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    phone: p.phone,
    score: p.score,
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const pin = String(body.pin || "");
  const s = await loadState();

  // --- first-use PIN setup: only while no PIN exists ---
  if (action === "setup") {
    if (s.pinHash !== null) {
      return NextResponse.json({ ok: false, error: "PIN pehle se set hai. Wahi PIN use karo." }, { status: 409 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: "PIN 4–6 digit ka hona chahiye." }, { status: 400 });
    }
    s.pinHash = hashPin(pin);
    await saveState(s);
    return NextResponse.json({ ok: true, message: "Host PIN set ho gaya. Ise yaad rakho — yahi admin ki chaabi hai." });
  }

  // --- everything below needs the correct PIN ---
  if (!checkPin(s, pin)) {
    return NextResponse.json({ ok: false, error: "Galat PIN." }, { status: 403 });
  }

  switch (action) {
    case "verify":
      return NextResponse.json({ ok: true, phase: s.phase, participantCount: s.participants.length, qIndex: s.qIndex, totalQuestions: QUESTIONS.length });

    case "start": {
      if (s.participants.length === 0) {
        return NextResponse.json({ ok: false, error: "Pehle players ko join karne do." }, { status: 409 });
      }
      s.phase = "question";
      s.qIndex = 0;
      s.qStartedAt = Date.now();
      s.answers = {};
      s.questionsPlayed = 1;
      await saveState(s);
      return NextResponse.json({ ok: true, phase: s.phase, qIndex: s.qIndex });
    }

    case "reveal": {
      if (s.phase !== "question") return NextResponse.json({ ok: false, error: "Koi live sawal nahi hai." }, { status: 409 });
      s.phase = "reveal";
      await saveState(s);
      return NextResponse.json({ ok: true, phase: s.phase });
    }

    case "next": {
      if (s.phase !== "reveal") return NextResponse.json({ ok: false, error: "Pehle reveal karo." }, { status: 409 });
      if (s.qIndex + 1 >= QUESTIONS.length) {
        s.phase = "finished";
        await saveState(s);
        return NextResponse.json({ ok: true, phase: s.phase });
      }
      s.qIndex += 1;
      s.phase = "question";
      s.qStartedAt = Date.now();
      s.answers = {};
      s.questionsPlayed += 1;
      await saveState(s);
      return NextResponse.json({ ok: true, phase: s.phase, qIndex: s.qIndex });
    }

    case "finish": {
      s.phase = "finished";
      await saveState(s);
      return NextResponse.json({ ok: true, phase: s.phase });
    }

    case "clear": {
      const pinHash = s.pinHash; // host keeps the same PIN after a clear
      const fresh = freshState();
      fresh.pinHash = pinHash;
      await saveState(fresh);
      return NextResponse.json({ ok: true, phase: fresh.phase });
    }

    case "export": {
      const rows = exportRows(s);
      const text = rows.map((r) => `${r.rank}. ${r.name} — ${r.phone} — ${r.score} pts`).join("\n");
      const csv = ["rank,name,phone,score", ...rows.map((r) => `${r.rank},"${r.name.replace(/"/g, '""')}",${r.phone},${r.score}`)].join("\n");
      return NextResponse.json({ ok: true, rows, text, csv });
    }

    case "report": {
      const rows = exportRows(s);
      return NextResponse.json({
        ok: true,
        report: {
          activity: ACTIVITY,
          host: HOST_NAME,
          event: EVENT_NAME,
          date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          totalParticipants: s.participants.length,
          questionsPlayed: s.questionsPlayed,
          totalAnswers: s.totalAnswers,
          top3: rows.slice(0, 3),
        },
      });
    }

    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
}
