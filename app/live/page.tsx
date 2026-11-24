"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface BoardRow { rank: number; id: string; name: string; score: number }
interface WinnerView { game: string; gameLabel: string; name: string; score: number; at: number }

interface StateView {
  phase: "lobby" | "question" | "reveal" | "finished";
  paused: boolean;
  mode: "quiz" | "clue" | "poll";
  modeLabel: string;
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
    paused: boolean;
    remainingMs: number;
    correctIndex?: number;
  } | null;
  clue: {
    index: number;
    total: number;
    stage: number;
    clues: string[];
    pointsNow: number;
    options: string[];
    answeredCount: number;
    paused: boolean;
    correctIndex?: number;
  } | null;
  poll: {
    index: number;
    total: number;
    a: string;
    b: string;
    votesA: number;
    votesB: number;
    totalVotes: number;
    pctA: number;
    pctB: number;
    myVote: number | null;
    startedAt: number | null;
    durationMs: number;
    remainingMs: number;
    paused: boolean;
    result: "a" | "b" | "tie" | null;
  } | null;
  myAnswer: { choice: number; points?: number; correct?: boolean } | null;
  liveLeaderboard: BoardRow[] | null;
  leaderboard: BoardRow[] | null;
  podium: BoardRow[] | null;
  winners: WinnerView[];
}

function Board({ rows, pid, limit }: { rows: BoardRow[]; pid: string; limit?: number }) {
  return (
    <table className="board">
      <thead>
        <tr><th>#</th><th>Player</th><th>Score</th></tr>
      </thead>
      <tbody>
        {(limit ? rows.slice(0, limit) : rows).map((r) => (
          <tr key={r.id} className={r.id === pid ? "me" : ""}>
            <td>{r.rank}</td><td>{r.name}</td><td>{r.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LivePage() {
  const [pid, setPid] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<StateView | null>(null);
  const [err, setErr] = useState("");
  const [joining, setJoining] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const confettiDone = useRef(false);

  useEffect(() => {
    setPid(localStorage.getItem("ccu-pid") || "");
    setName(localStorage.getItem("ccu-name") || "");
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/state?pid=${encodeURIComponent(pid)}`, { cache: "no-store" });
      if (!r.ok) return; // an error response must never clear the stored ID
      const data: StateView = await r.json();
      // Stale-session recovery: if the host cleared the room, this player
      // was removed server-side but the browser still holds the old ID —
      // without this check the join form never comes back and the player
      // can never rejoin from this phone. A SUCCESSFUL lobby-phase state
      // whose participant list definitively lacks my ID means the session
      // is gone: drop the stored ID so the join form reappears. Lobby
      // phase only — never kick anyone mid-game on a partial response,
      // and the catch below means a failed request never clears either.
      if (
        pid &&
        data.phase === "lobby" &&
        !data.participants.some((p) => p.id === pid)
      ) {
        localStorage.removeItem("ccu-pid");
        localStorage.removeItem("ccu-name");
        setPid("");
      }
      setView(data);
    } catch {
      /* network blip — next tick retries; a failed request never clears the ID */
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

  // reset my pick/vote when a new item starts
  const itemKey = `${view?.mode}:${view?.question?.index ?? view?.clue?.index ?? view?.poll?.index ?? -1}`;
  useEffect(() => {
    setPicked(null);
    setVoted(null);
  }, [itemKey]);

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

  async function vote(side: number) {
    if (voted !== null) return;
    setVoted(side);
    try {
      const r = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, side }),
      });
      const data = await r.json();
      if (!data.ok) {
        setErr(data.error || "Vote lock nahi hua.");
        setVoted(null);
      }
    } catch {
      setErr("Network problem — vote shayad nahi gaya.");
      setVoted(null);
    }
  }

  const q = view?.question;
  const c = view?.clue;
  const p = view?.poll;
  const paused = !!view?.paused;

  // Timed items (quiz + poll) share the countdown math; clue has no timer.
  const timed = q ?? p;
  const isPausedTimed = !!timed?.paused;
  const timeLeft = !timed
    ? 0
    : isPausedTimed
      ? timed.remainingMs
      : timed.startedAt != null
        ? Math.max(0, timed.durationMs - (nowMs - timed.startedAt))
        : 0;
  const locked = picked !== null || !!view?.myAnswer;
  const myVote = voted ?? p?.myVote ?? null;

  // Live ranking rows for the question phase: top 5, plus my own row if I
  // am outside the top 5.
  const liveRows: BoardRow[] = (() => {
    const lb = view?.liveLeaderboard;
    if (!lb) return [];
    const top = lb.slice(0, 5);
    const mine = lb.find((r) => r.id === pid);
    if (mine && !top.some((r) => r.id === mine.id)) return [...top, mine];
    return top;
  })();

  const pauseBanner = (
    <div className="okmsg center" role="alert" style={{ fontSize: "1.1rem" }}>
      ⏸ Host ne game pause kiya hai — thoda ruko!
      <br />
      <span className="muted">Resume hote hi game wahi se chalega jahan ruka tha.</span>
    </div>
  );

  const liveRanking = liveRows.length > 0 && (
    <>
      <h3 style={{ marginTop: 18 }}>Live Ranking</h3>
      <Board rows={liveRows} pid={pid} />
      <p className="muted center" style={{ marginBottom: 0 }}>Score jawab dete hi live badalta hai.</p>
    </>
  );

  return (
    <main className="narrow">
      <p>
        <Link href="/">← Home</Link>
      </p>
      <div className="prize-strip">Har game ka apna champion 🏆 Winners Board par naam</div>

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
          <p>
            <span className="chip red">Aaj ka game: {view.modeLabel}</span>
          </p>
          <div className="big-count">{view.participantCount}</div>
          <p>players taiyaar hain. Host ke start karne ka intezaar karo — Metro aane wali hai.</p>
          <p>
            {view.participants.slice(0, 60).map((pl) => (
              <span key={pl.id} className={`chip ${pl.id === pid ? "yellow" : ""}`}>{pl.name}</span>
            ))}
          </p>
        </section>
      )}

      {/* ---------------- QUIZ ---------------- */}
      {pid && view?.mode === "quiz" && view.phase === "question" && q && (
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
          {paused ? pauseBanner : (
            <p className="muted center" style={{ margin: 0 }}>
              {locked ? "Jawab lock ho gaya — reveal ka wait karo." : `${Math.ceil(timeLeft / 1000)} second bache — tez jawab, zyada points!`}
            </p>
          )}
          <div className="options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`opt c${i % 4} ${picked === i ? "picked" : ""}`}
                disabled={locked || timeLeft <= 0 || paused}
                onClick={() => answer(i)}
              >
                {opt}
              </button>
            ))}
          </div>
          {liveRanking}
        </section>
      )}

      {pid && view?.mode === "quiz" && view.phase === "reveal" && q && (
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
              <Board rows={view.leaderboard} pid={pid} limit={10} />
            </>
          )}
        </section>
      )}

      {/* ---------------- CLUE RACE ---------------- */}
      {pid && view?.mode === "clue" && view.phase === "question" && c && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            <span className="chip red">Clue Race — Kaun Hai Ye?</span>
            <span className="chip">Round {c.index + 1} / {c.total}</span>
            <span className="chip">{c.answeredCount} jawab aa gaye</span>
          </p>
          <h2 style={{ fontSize: "1.5rem" }}>Kaun hai ye?</h2>
          {c.clues.map((clueText, i) => (
            <p key={i} style={{ fontSize: "1.1rem" }}>
              <strong>Clue {i + 1}:</strong> {clueText}
            </p>
          ))}
          {paused ? pauseBanner : (
            <p className="muted center">
              {locked
                ? "Jawab lock ho gaya — reveal ka wait karo."
                : `Abhi lock kiya to ${c.pointsNow} points! Agla clue aaya to points ghat jayenge — risk lo ya ruko, tumhari marzi.`}
            </p>
          )}
          <div className="options">
            {c.options.map((opt, i) => (
              <button
                key={i}
                className={`opt c${i % 4} ${picked === i ? "picked" : ""}`}
                disabled={locked || paused}
                onClick={() => answer(i)}
              >
                {opt}
              </button>
            ))}
          </div>
          {liveRanking}
        </section>
      )}

      {pid && view?.mode === "clue" && view.phase === "reveal" && c && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            <span className="chip red">Clue Race — Kaun Hai Ye?</span>
            <span className="chip">Round {c.index + 1} / {c.total} — Reveal</span>
          </p>
          {c.clues.map((clueText, i) => (
            <p key={i}>
              <strong>Clue {i + 1}:</strong> {clueText}
            </p>
          ))}
          <div className="options">
            {c.options.map((opt, i) => (
              <button
                key={i}
                disabled
                className={`opt ${i === c.correctIndex ? "correct" : view.myAnswer?.choice === i ? "wrong" : ""}`}
              >
                {opt} {i === c.correctIndex ? "✓" : ""}
              </button>
            ))}
          </div>
          {view.myAnswer ? (
            <p className="center" style={{ fontWeight: 700 }}>
              {view.myAnswer.correct
                ? `Sahi pehchan! +${view.myAnswer.points} points`
                : "Galat pehchan — agla round tumhara hai."}
            </p>
          ) : (
            <p className="center muted">Tumne is round me jawab lock nahi kiya.</p>
          )}
          {view.leaderboard && (
            <>
              <h3 style={{ marginTop: 18 }}>Leaderboard</h3>
              <Board rows={view.leaderboard} pid={pid} limit={10} />
            </>
          )}
        </section>
      )}

      {/* ---------------- POLL BATTLE ---------------- */}
      {pid && view?.mode === "poll" && (view.phase === "question" || view.phase === "reveal") && p && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            <span className="chip red">Janta Poll Battle</span>
            <span className="chip">Battle {p.index + 1} / {p.total}</span>
            <span className="chip">{p.totalVotes} votes aa gaye</span>
          </p>
          <h2 className="center" style={{ fontSize: "1.6rem" }}>{p.a} <span className="muted">vs</span> {p.b}</h2>
          {view.phase === "question" && (
            <>
              <div className="timerbar">
                <div style={{ width: `${(timeLeft / p.durationMs) * 100}%` }} />
              </div>
              {paused ? pauseBanner : (
                <p className="muted center" style={{ margin: 0 }}>
                  {myVote !== null ? "Vote lock ho gaya — janta ka faisla dekho live!" : `${Math.ceil(timeLeft / 1000)} second bache — apni side chuno! Majority side ko +100 points.`}
                </p>
              )}
              <div className="options">
                <button className={`opt c0 ${myVote === 0 ? "picked" : ""}`} disabled={myVote !== null || timeLeft <= 0 || paused} onClick={() => vote(0)}>
                  {p.a}
                </button>
                <button className={`opt c2 ${myVote === 1 ? "picked" : ""}`} disabled={myVote !== null || timeLeft <= 0 || paused} onClick={() => vote(1)}>
                  {p.b}
                </button>
              </div>
            </>
          )}
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "6px 0" }}>
              <strong>{p.a}</strong> — {p.votesA} votes ({p.pctA}%)
            </p>
            <div className="timerbar"><div style={{ width: `${p.pctA}%` }} /></div>
            <p style={{ margin: "10px 0 6px" }}>
              <strong>{p.b}</strong> — {p.votesB} votes ({p.pctB}%)
            </p>
            <div className="timerbar"><div style={{ width: `${p.pctB}%` }} /></div>
          </div>
          {view.phase === "reveal" && (
            <p className="center" style={{ fontWeight: 700, marginTop: 14 }}>
              {p.result === "tie"
                ? "Tie! Kisi ko points nahi mile."
                : `Janta ka faisla: ${p.result === "a" ? p.a : p.b} jeeta! Us side ke sab voters ko +100 points.`}
              {myVote !== null && p.result !== "tie" && (
                <><br />{((p.result === "a" && myVote === 0) || (p.result === "b" && myVote === 1)) ? "Tum jeetne wali side par the — +100! 🎉" : "Tum haarne wali side par the — agli battle tumhari hai."}</>
              )}
            </p>
          )}
          {view.phase === "question" ? liveRanking : view.leaderboard && (
            <>
              <h3 style={{ marginTop: 18 }}>Leaderboard</h3>
              <Board rows={view.leaderboard} pid={pid} limit={10} />
            </>
          )}
        </section>
      )}

      {/* ---------------- FINISHED (all games) ---------------- */}
      {pid && view?.phase === "finished" && (
        <section className="panel">
          <h2 className="center" style={{ fontSize: "2rem" }}>Podium — Top 3</h2>
          <p className="center">
            <span className="chip red">{view.modeLabel}</span>
          </p>
          <p className="center muted">Last station: Comic Con! Har game ka champion — Winners Board par naam.</p>
          <div className="podium">
            {(view.podium || []).map((pl) => (
              <div key={pl.id} className={`panel slot ${pl.rank === 1 ? "yellow" : ""}`} style={{ marginBottom: 0 }}>
                <div className="medal">{pl.rank === 1 ? "🥇" : pl.rank === 2 ? "🥈" : "🥉"}</div>
                <h3>{pl.name}</h3>
                <p style={{ margin: 0 }}><strong>{pl.score}</strong> points</p>
              </div>
            ))}
          </div>
          {view.leaderboard && (
            <>
              <h3 style={{ marginTop: 20 }}>Poori leaderboard</h3>
              <Board rows={view.leaderboard} pid={pid} />
            </>
          )}
          <p className="center muted">Hosted by Vitthal Diwedi · Har game ka apna champion — Winners Board par naam</p>
        </section>
      )}

      {!view && <p className="center muted">Room se connect ho raha hai…</p>}
    </main>
  );
}
