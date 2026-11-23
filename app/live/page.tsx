"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface StateView {
  phase: "lobby" | "question" | "reveal" | "finished";
  participantCount: number;
  participants: { id: string; name: string }[];
  question: {
    index: number;
    total: number;
    category: string;
    text: string;
    options: string[];
    startedAt: number | null;
    durationMs: number;
    answeredCount: number;
    correctIndex?: number;
  } | null;
  myAnswer: { choice: number; points?: number; correct?: boolean } | null;
  leaderboard: { rank: number; id: string; name: string; score: number }[] | null;
  podium: { rank: number; id: string; name: string; score: number }[] | null;
}

export default function LivePage() {
  const [pid, setPid] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<StateView | null>(null);
  const [err, setErr] = useState("");
  const [joining, setJoining] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const confettiDone = useRef(false);

  useEffect(() => {
    setPid(localStorage.getItem("ccu-pid") || "");
    setName(localStorage.getItem("ccu-name") || "");
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/state?pid=${encodeURIComponent(pid)}`, { cache: "no-store" });
      if (r.ok) setView(await r.json());
    } catch {
      /* network blip — next tick retries */
    }
  }, [pid]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 1000);
    return () => clearInterval(t);
  }, [poll]);

  // smooth local countdown (display only — the server clock decides scoring)
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // reset my pick when a new question starts
  const qIndex = view?.question?.index ?? -1;
  useEffect(() => {
    setPicked(null);
  }, [qIndex]);

  // confetti once, when the podium appears
  useEffect(() => {
    if (view?.phase === "finished" && !confettiDone.current) {
      confettiDone.current = true;
      import("canvas-confetti").then((m) => {
        const fire = m.default;
        fire({ particleCount: 160, spread: 80, origin: { y: 0.25 } });
        setTimeout(() => fire({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0 } }), 250);
        setTimeout(() => fire({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1 } }), 400);
      });
    }
  }, [view?.phase]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setJoining(true);
    try {
      const r = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await r.json();
      if (!data.ok) {
        setErr(data.error || "Join nahi ho paya.");
      } else {
        localStorage.setItem("ccu-pid", data.participant.id);
        localStorage.setItem("ccu-name", data.participant.name);
        setPid(data.participant.id);
        poll();
      }
    } catch {
      setErr("Network problem — dobara try karo.");
    }
    setJoining(false);
  }

  async function answer(choice: number) {
    if (picked !== null) return;
    setPicked(choice); // lock instantly on tap — no animation gates the tap
    try {
      const r = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, choice }),
      });
      const data = await r.json();
      if (!data.ok) {
        setErr(data.error || "Jawab lock nahi hua.");
        setPicked(null);
      }
    } catch {
      setErr("Network problem — jawab shayad nahi gaya.");
      setPicked(null);
    }
  }

  const q = view?.question;
  const timeLeft =
    q?.startedAt != null ? Math.max(0, q.durationMs - (nowMs - q.startedAt)) : 0;
  const locked = picked !== null || !!view?.myAnswer;

  return (
    <main className="narrow">
      <p>
        <Link href="/">← Home</Link>
      </p>
      <div className="prize-strip">Chance to Win Free Passes for Day 1</div>

      {err && <div className="err">{err}</div>}

      {!pid && (
        <section className="panel">
          <h2 style={{ fontSize: "1.8rem" }}>Player card banao</h2>
          <p>Naam aur mobile number daalo — number sirf winners ki pehchan ke liye hai.</p>
          <form onSubmit={join}>
            <label className="lbl" htmlFor="nm">Tumhara naam</label>
            <input id="nm" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Sharma" required />
            <label className="lbl" htmlFor="ph">Mobile number (10 digit)</label>
            <input id="ph" className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" required />
            <button className="btn red block" type="submit" disabled={joining}>
              {joining ? "Join ho raha hai…" : "Lobby me ghuso"}
            </button>
          </form>
        </section>
      )}

      {pid && view?.phase === "lobby" && (
        <section className="panel center">
          <h2 style={{ fontSize: "1.8rem" }}>Lobby</h2>
          <div className="big-count">{view.participantCount}</div>
          <p>players taiyaar hain. Host ke start karne ka intezaar karo — Metro aane wali hai.</p>
          <p>
            {view.participants.slice(0, 60).map((p) => (
              <span key={p.id} className={`chip ${p.id === pid ? "yellow" : ""}`}>{p.name}</span>
            ))}
          </p>
        </section>
      )}

      {pid && view?.phase === "question" && q && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            <span className="chip red">{q.category}</span>
            <span className="chip">Sawal {q.index + 1} / {q.total}</span>
            <span className="chip">{q.answeredCount} jawab aa gaye</span>
          </p>
          <h2 style={{ fontSize: "1.55rem" }}>{q.text}</h2>
          <div className="timerbar">
            <div style={{ width: `${(timeLeft / q.durationMs) * 100}%` }} />
          </div>
          <p className="muted center" style={{ margin: 0 }}>
            {locked ? "Jawab lock ho gaya — reveal ka wait karo." : `${Math.ceil(timeLeft / 1000)} second bache — tez jawab, zyada points!`}
          </p>
          <div className="options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`opt c${i % 4} ${picked === i ? "picked" : ""}`}
                disabled={locked || timeLeft <= 0}
                onClick={() => answer(i)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>
      )}

      {pid && view?.phase === "reveal" && q && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            <span className="chip red">{q.category}</span>
            <span className="chip">Sawal {q.index + 1} / {q.total} — Reveal</span>
          </p>
          <h2 style={{ fontSize: "1.4rem" }}>{q.text}</h2>
          <div className="options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                disabled
                className={`opt ${i === q.correctIndex ? "correct" : view.myAnswer?.choice === i ? "wrong" : ""}`}
              >
                {opt} {i === q.correctIndex ? "✓" : ""}
              </button>
            ))}
          </div>
          {view.myAnswer ? (
            <p className="center" style={{ fontWeight: 700 }}>
              {view.myAnswer.correct
                ? `Sahi jawab! +${view.myAnswer.points} points`
                : "Is baar nahi — agla sawal tumhara hai."}
            </p>
          ) : (
            <p className="center muted">Tumne is sawal ka jawab nahi diya.</p>
          )}
          {view.leaderboard && (
            <>
              <h3 style={{ marginTop: 18 }}>Leaderboard</h3>
              <table className="board">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {view.leaderboard.slice(0, 10).map((r) => (
                    <tr key={r.id} className={r.id === pid ? "me" : ""}>
                      <td>{r.rank}</td><td>{r.name}</td><td>{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {pid && view?.phase === "finished" && (
        <section className="panel">
          <h2 className="center" style={{ fontSize: "2rem" }}>Podium — Top 3</h2>
          <p className="center muted">Last station: Comic Con! In teeno ko Day 1 pass jeetne ka chance milega.</p>
          <div className="podium">
            {(view.podium || []).map((p) => (
              <div key={p.id} className={`panel slot ${p.rank === 1 ? "yellow" : ""}`} style={{ marginBottom: 0 }}>
                <div className="medal">{p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}</div>
                <h3>{p.name}</h3>
                <p style={{ margin: 0 }}><strong>{p.score}</strong> points</p>
              </div>
            ))}
          </div>
          {view.leaderboard && (
            <>
              <h3 style={{ marginTop: 20 }}>Poori leaderboard</h3>
              <table className="board">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {view.leaderboard.map((r) => (
                    <tr key={r.id} className={r.id === pid ? "me" : ""}>
                      <td>{r.rank}</td><td>{r.name}</td><td>{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="center muted">Hosted by Vitthal Diwedi · Chance to Win Free Passes for Day 1</p>
        </section>
      )}

      {!view && <p className="center muted">Room se connect ho raha hai…</p>}
    </main>
  );
}
