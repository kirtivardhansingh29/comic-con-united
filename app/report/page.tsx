"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Report {
  activity: string;
  host: string;
  event: string;
  date: string;
  totalParticipants: number;
  questionsPlayed: number;
  totalAnswers: number;
  top3: { rank: number; name: string; phone: string; score: number }[];
}

function ReportInner() {
  const params = useSearchParams();
  const [pin, setPin] = useState(params.get("pin") || "");
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState("");

  async function load(p: string) {
    setErr("");
    const r = await fetch("/api/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: p, action: "report" }),
    });
    const d = await r.json();
    if (d.ok) setReport(d.report);
    else setErr(d.error || "Report nahi mili.");
  }

  useEffect(() => {
    const p = params.get("pin");
    if (p) load(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="narrow">
      <p className="no-print"><Link href="/host">← Host panel</Link></p>

      {!report && (
        <section className="panel no-print">
          <h2 style={{ fontSize: "1.7rem" }}>Proof report</h2>
          <p>Officials ko dikhane wala saboot — host PIN daalo.</p>
          <form onSubmit={(e) => { e.preventDefault(); load(pin); }}>
            <label className="lbl" htmlFor="pin">Host PIN</label>
            <input id="pin" className="input" inputMode="numeric" type="password" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••" required />
            <button className="btn red block" type="submit">Report kholo</button>
          </form>
          {err && <div className="err" style={{ marginTop: 14 }}>{err}</div>}
        </section>
      )}

      {report && (
        <section className="panel">
          <div style={{ borderBottom: "4px solid var(--ink)", paddingBottom: 10, marginBottom: 14 }}>
            <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>{report.activity}</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>Official proof report — fan activity</p>
          </div>
          <table className="board">
            <tbody>
              <tr><th style={{ width: "38%" }}>Activity</th><td>{report.activity}</td></tr>
              <tr><th>Host</th><td>{report.host}</td></tr>
              <tr><th>Event</th><td>{report.event} (5–6 Dec 2026, NSIC Exhibition Grounds, Okhla)</td></tr>
              <tr><th>Date</th><td>{report.date}</td></tr>
              <tr><th>Total participants</th><td>{report.totalParticipants}</td></tr>
              <tr><th>Questions played</th><td>{report.questionsPlayed}</td></tr>
              <tr><th>Total answers</th><td>{report.totalAnswers}</td></tr>
              <tr><th>Prize</th><td>Chance to Win Free Passes for Day 1 — Top 3</td></tr>
            </tbody>
          </table>
          <h3 style={{ marginTop: 20, fontSize: "1.4rem" }}>Top 3 winners</h3>
          <table className="board">
            <thead>
              <tr><th>Rank</th><th>Naam</th><th>Phone</th><th>Score</th></tr>
            </thead>
            <tbody>
              {report.top3.length === 0 && (
                <tr><td colSpan={4}>Abhi koi winner nahi hai.</td></tr>
              )}
              {report.top3.map((w) => (
                <tr key={w.rank}>
                  <td>{w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : "🥉"} {w.rank}</td>
                  <td>{w.name}</td>
                  <td>{w.phone}</td>
                  <td>{w.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 16 }}>
            <button className="btn no-print" onClick={() => window.print()}>Print / screenshot ke liye save karo</button>
          </p>
          <p className="muted">
            Ye report game ke server data se bani hai. Ye ek fan activity hai, Comic Con India
            ka official event nahi hai.
          </p>
        </section>
      )}
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<main className="narrow"><p>Loading…</p></main>}>
      <ReportInner />
    </Suspense>
  );
}
