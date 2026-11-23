import { NextRequest, NextResponse } from "next/server";
import { loadState, saveState, newId, MAX_PARTICIPANTS } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 40);
  const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Naam sahi se likho (kam se kam 2 akshar)." }, { status: 400 });
  }
  if (phone.length !== 10) {
    return NextResponse.json({ ok: false, error: "10-digit wala mobile number daalo." }, { status: 400 });
  }

  const s = await loadState();
  if (s.phase === "finished") {
    return NextResponse.json({ ok: false, error: "Game khatam ho chuka hai." }, { status: 409 });
  }
  // Same phone number rejoining = same player (page refresh safe).
  const existing = s.participants.find((p) => p.phone === phone);
  if (existing) {
    return NextResponse.json({ ok: true, participant: { id: existing.id, name: existing.name }, rejoined: true });
  }
  if (s.participants.length >= MAX_PARTICIPANTS) {
    return NextResponse.json({ ok: false, error: "Room full ho gaya hai." }, { status: 409 });
  }
  const p = { id: newId(), name, phone, score: 0, joinedAt: Date.now() };
  s.participants.push(p);
  await saveState(s);
  return NextResponse.json({ ok: true, participant: { id: p.id, name: p.name } });
}
