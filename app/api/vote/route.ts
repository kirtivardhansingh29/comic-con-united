import { NextRequest, NextResponse } from "next/server";
import { getMeta, getParticipant, submitVote, POLL_MS } from "@/lib/store";

export const dynamic = "force-dynamic";

// Janta Poll Battle vote. One vote per player per battle (HSETNX lock in
// submitVote). There is no right or wrong side — when the host closes the
// battle, everyone on the majority side scores +100 (see /api/host reveal).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pid = String(body.pid || "");
  const side = Number(body.side);

  const meta = await getMeta();
  if (meta.mode !== "poll" || meta.phase !== "question" || meta.qIndex < 0 || !meta.qStartedAt) {
    return NextResponse.json({ ok: false, error: "Abhi koi battle live nahi hai." }, { status: 409 });
  }
  if (meta.pausedAt != null) {
    return NextResponse.json({ ok: false, error: "Game paused hai — host ke resume karne ka wait karo." }, { status: 409 });
  }
  const me = await getParticipant(pid);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Player nahi mila — dobara join karo." }, { status: 404 });
  }
  if (side !== 0 && side !== 1) {
    return NextResponse.json({ ok: false, error: "Galat side." }, { status: 400 });
  }

  const elapsed = Date.now() - meta.qStartedAt;
  if (elapsed > POLL_MS + 1500) {
    return NextResponse.json({ ok: false, error: "Time khatam — vote late pahuncha." }, { status: 409 });
  }

  const added = await submitVote(meta.qIndex, pid, side as 0 | 1);
  if (!added) {
    return NextResponse.json({ ok: false, error: "Tumhara vote pehle hi lock ho chuka hai." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, locked: true });
}
