"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ARENA_ROUNDS } from "@/lib/arena-data";

interface APlayer { id: string; name: string; phone: string; score: number }

const PKEY = "ccu-arena-players-v1";
const CKEY = "ccu-arena-pickcycle-v1";

export default function ArenaPage() {
  const [players, setPlayers] = useState<APlayer[]>([]);
  const [cycle, setCycle] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickedId, setPickedId] = useState<string>("");
  const [roundId, setRoundId] = useState(ARENA_ROUNDS[0].id);
  const [itemIdx, setItemIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PKEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setPlayers(arr.filter((p) => p && typeof p.name === "string").map((p) => ({ id: String(p.id || Math.random()), name: p.name, phone: String(p.phone || ""), score: Number(p.score) || 0 })));
      }
      const cyc = localStorage.getItem(CKEY);
      if (cyc) setCycle(JSON.parse(cyc));
    } catch { /* fresh start */ }
  }, []);

  useEffect(() => { localStorage.setItem(PKEY, JSON.stringify(players)); }, [players]);
  useEffect(() => { localStorage.setItem(CKEY, JSON.stringify(cycle)); }, [cycle]);

  const round = ARENA_ROUNDS.find((r) => r.id === roundId) || ARENA_ROUNDS[0];
  const item = round.items[Math.min(itemIdx, round.items.length - 1)];
  const board = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const picked = players.find((p) => p.id === pickedId);

  function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) { setNote("Naam kam se kam 2 akshar ka rakho."); return; }
    const p: APlayer = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: n, phone: phone.replace(/\D/g, "").slice(-10), score: 0 };
    setPlayers((ps) => [...ps, p]);
    setCycle((c) => [...c, p.id]);
    setName(""); setPhone(""); setNote("");
  }

  function removePlayer(id: string) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    setCycle((c) => c.filter((x) => x !== id));
    if (pickedId === id) setPickedId("");
  }

  function pickRandom() {
    if (players.length === 0) { setNote("Pehle players jodo."); return; }
    let pool = cycle.filter((id) => players.some((p) => p.id === id));
    if (pool.length === 0) pool = players.map((p) => p.id); // cycle khatam — naya round
    const id = pool[Math.floor(Math.random() * pool.length)];
    setCycle(pool.filter((x) => x !== id));
    setPickedId(id);
    setNote("");
  }

  function award(pid: string, pts: number) {
    setPlayers((ps) => ps.map((p) => (p.id === pid ? { ...p, score: p.score + pts } : p)));
  }

  function gotoItem(d: number) {
    setItemIdx((i) => Math.max(0, Math.min(round.items.length - 1, i + d)));
    setShowHint(false);
    setRevealed(false);
  }

  function exportText() {
    return board.map((p, i) => `${i + 1}. ${p.name}${p.phone ? ` — ${p.phone}` : ""} — ${p.score} pts${i < 3 ? " 🏆 WINNER" : ""}`).join("\n");
  }
  function downloadCsv() {
    const csv = ["rank,name,phone,score", ...board.map((p, i) => `${i + 1},"${p.name.replace(/"/g, '""')}",${p.phone},${p.score}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "comic-con-united-arena.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="narrow">
      <p><Link href="/">← Home</Link></p>
      <div className="prize-strip">Har game ka apna champion 🏆 Winners Board par naam</div>

      {/* Players */}
      <section className="panel">
        <h2 style={{ fontSize: "1.7rem" }}>Players ({players.length})</h2>
        <form onSubmit={addPlayer}>
          <label className="lbl" htmlFor="an">Naam</label>
          <input id="an" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Player ka naam" />
          <label className="lbl" htmlFor="ap">Phone (optional)</label>
          <input id="ap" className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10 digit — winners ki pehchan ke liye" />
          <button className="btn red block" type="submit">Player jodo</button>
        </form>
        {note && <div className="err" style={{ marginTop: 12 }}>{note}</div>}
        <div style={{ marginTop: 14 }}>
          {board.map((p, i) => (
            <p key={p.id} style={{ margin: "6px 0" }}>
              <span className={`chip ${p.id === pickedId ? "yellow" : ""}`}>{i + 1}. {p.name} — {p.score} pts</span>
              <button className="btn paper" style={{ minHeight: 36, padding: "4px 10px", fontSize: "0.85rem" }} onClick={() => removePlayer(p.id)}>Hatao</button>
            </p>
          ))}
        </div>
        <p>
          <button className="btn blue" onClick={pickRandom}>Random player chuno</button>{" "}
          <span className="muted">Baaki bina-chune: {cycle.filter((id) => players.some((p) => p.id === id)).length} / {players.length} (repeat nahi hoga)</span>
        </p>
        {picked && <p className="okmsg">Ab bari hai: <strong>{picked.name}</strong> ki!</p>}
      </section>

      {/* Round play */}
      <section className="panel">
        <h2 style={{ fontSize: "1.7rem" }}>Round chuno</h2>
        <p>
          {ARENA_ROUNDS.map((r) => (
            <button key={r.id} className={`btn ${r.id === roundId ? "red" : "paper"}`} style={{ margin: "0 8px 8px 0", minHeight: 44, padding: "8px 12px", fontSize: "0.95rem" }}
              onClick={() => { setRoundId(r.id); setItemIdx(0); setShowHint(false); setRevealed(false); }}>
              {r.name}
            </button>
          ))}
        </p>
        <p style={{ marginTop: 0 }}>
          <span className="chip yellow">{round.name}</span>
          <span className="chip">Sahi jawab = +{round.points} pts</span>
          <span className="chip">Sawal {itemIdx + 1} / {round.items.length}</span>
        </p>
        <p className="muted">{round.tagline}</p>
        <h3 style={{ fontSize: "1.5rem", whiteSpace: "pre-wrap" }}>{item.prompt}</h3>
        {item.hint && !revealed && (
          showHint
            ? <p><span className="chip blue">Hint</span> {item.hint}</p>
            : <p><button className="btn paper" onClick={() => setShowHint(true)}>Hint dikhao</button></p>
        )}
        {!revealed ? (
          <p><button className="btn red" onClick={() => setRevealed(true)}>Jawab dikhao</button></p>
        ) : (
          <>
            <p className="okmsg">Jawab: <strong>{item.answer}</strong></p>
            <p style={{ fontWeight: 700 }}>Points kisko dein?</p>
            <p>
              {players.map((p) => (
                <button key={p.id} className="btn" style={{ margin: "0 8px 8px 0", minHeight: 44, padding: "8px 12px", fontSize: "0.95rem" }}
                  onClick={() => { award(p.id, round.points); gotoItem(1); }}>
                  {p.name} +{round.points}
                </button>
              ))}
              <button className="btn paper" style={{ minHeight: 44, padding: "8px 12px", fontSize: "0.95rem" }} onClick={() => gotoItem(1)}>Kisi ko nahi — agla</button>
            </p>
          </>
        )}
        <p>
          <button className="btn paper" onClick={() => gotoItem(-1)} disabled={itemIdx === 0}>← Pichla</button>{" "}
          <button className="btn paper" onClick={() => gotoItem(1)} disabled={itemIdx >= round.items.length - 1}>Agla →</button>
        </p>
      </section>

      {/* Scoreboard / podium / export */}
      <section className="panel">
        <h2 style={{ fontSize: "1.7rem" }}>Scoreboard</h2>
        {board.length === 0 ? <p className="muted">Abhi koi player nahi hai.</p> : (
          <table className="board">
            <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
            <tbody>
              {board.map((p, i) => (
                <tr key={p.id} className={p.id === pickedId ? "me" : ""}><td>{i + 1}</td><td>{p.name}</td><td>{p.score}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ marginTop: 14 }}>
          <button className="btn red" onClick={() => setShowPodium((v) => !v)}>Podium dikhao</button>{" "}
          <button className="btn" onClick={async () => { await navigator.clipboard.writeText(exportText()); setCopied(true); }}>{copied ? "Copy ho gaya ✓" : "List copy karo"}</button>{" "}
          <button className="btn blue" onClick={downloadCsv}>CSV download</button>
        </p>
        {showPodium && board.length > 0 && (
          <div className="podium">
            {board.slice(0, 3).map((p, i) => (
              <div key={p.id} className={`panel slot ${i === 0 ? "yellow" : ""}`} style={{ marginBottom: 0 }}>
                <div className="medal">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                <h3>{p.name}</h3>
                <p style={{ margin: 0 }}><strong>{p.score}</strong> points</p>
              </div>
            ))}
          </div>
        )}
        <p className="muted">Scores is device par hi save hote hain (localStorage).</p>
      </section>
    </main>
  );
}
