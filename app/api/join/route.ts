import { NextRequest, NextResponse } from "next/server";
import { joinPlayer } from "@/lib/store";

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

  // Concurrency-safe: the store claims the phone atomically and writes this
  // player into their own hash field — simultaneous joins cannot collide.
  const res = await joinPlayer(name, phone);
  if (res.status === "finished") {
    return NextResponse.json({ ok: false, error: "Game khatam ho chuka hai." }, { status: 409 });
  }
  if (res.status === "full") {
    return NextResponse.json({ ok: false, error: "Room full ho gaya hai." }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    participant: { id: res.participant.id, name: res.participant.name },
    rejoined: res.status === "rejoined",
  });
}
