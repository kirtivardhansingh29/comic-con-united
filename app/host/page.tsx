"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface HostPlayer { id: string; name: string; phone: string; score: number }
interface HostStatus {
  phase: string;
  paused: boolean;
  participantCount: number;
  qIndex: number;
  totalQuestions: number;
  participants?: HostPlayer[];
}

async function hostCall(pin: string, action: string, extra?: Record<string, unknown>) {
  const r = await fetch("/api/host", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, action, ...extra }),
  });
  return r.json();
}

export default function HostPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [exportText, setExportText] = useState("");
  const [exportCsv, setExportCsv] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then((v) => setNeedsSetup(!v.hostReady))
      .catch(() => {});
    const saved = sessionStorage.getItem("ccu-host-pin");
    if (saved) setPin(saved);
  }, []);

  const refresh = useCallback(
    async (p: string) => {
      const d = await hostCall(p, "verify");
      if (d.ok) setStatus(d);
    },
    []
  );

  useEffect(() => {
    if (authed && pin) {
      refresh(pin);
      const t = setInterval(() => refresh(pin), 2000);
      return () => clearInterval(t);
    }
  }, [authed, pin, refresh]);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (needsSetup) {
      const d = await hostCall(pin, "setup");
      if (d.ok) {
        setMsg(d.message);
        setNeedsSetup(false);
        sessionStorage.setItem("ccu-host-pin", pin);
        setAuthed(true);
      } else setErr(d.error || "PIN set nahi hua.");
    } else {
      const d = await hostCall(pin, "verify");
      if (d.ok) {
        sessionStorage.setItem("ccu-host-pin", pin);
        setAuthed(true);
        setStatus(d);
      } else setErr(d.error || "Galat PIN.");
    }
  }

  async function act(action: string, extra?: Record<string, unknown>) {
    setErr(""); setMsg("");
    const d = await hostCall(pin, action, extra);
    if (d.ok) {
      setMsg(`Ho gaya: ${action} (phase: ${d.phase ?? status?.phase ?? ""})`);
      refresh(pin);
    } else setErr(d.error || "Action fail ho gaya.");
  }

  async function removePlayer(p: HostPlayer) {
    if (!confirm(`${p.name} ko room se hata dein? Unke answers aur score bhi chale jayenge.`)) return;
    await act("removePlayer", { pid: p.id });
  }

  async function doExport() {
    setErr("");
    const d = await hostCall(pin, "export");
    if (d.ok) {
      setExportText(d.text || "(abhi koi player nahi hai)");
      setExportCsv(d.csv || "");
      setCopied(false);
    } else setErr(d.error || "Export fail.");
  }

  function downloadCsv() {
    const blob = new Blob([exportCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comic-con-united-participants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="narrow">
      <p><Link href="/">← Home</Link> · <Link href="/live">Live Quiz dekho</Link></p>
      <section className="panel">
        <h2 style={{ fontSize: "1.8rem" }}>Host panel</h2>
        {!authed ? (
          <>
            <p>
              {needsSetup
                ? "Pehli baar use ho raha hai — apna 4–6 digit ka host PIN set karo. Yahi PIN controls, export aur report — teeno ki chaabi hai."
                : "Apna host PIN daalo. Galat PIN seedha reject hoga."}
            </p>
            <form onSubmit={submitPin}>
              <label className="lbl" htmlFor="pin">Host PIN</label>
              <input id="pin" className="input" inputMode="numeric" type="password" value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••" required />
              <button className="btn red block" type="submit">
                {needsSetup ? "PIN set karo" : "Panel kholo"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p>
              <span className="chip yellow">Phase: {status?.phase ?? "…"}</span>
              {status?.paused && <span className="chip red">⏸ Paused</span>}
              <span className="chip">Players: {status?.participantCount ?? 0}</span>
              <span className="chip">Sawal: {status ? status.qIndex + 1 : 0} / {status?.totalQuestions ?? 15}</span>
            </p>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <button className="btn red" onClick={() => act("start")}>Quiz start</button>
              <button className="btn blue" onClick={() => act("reveal")}>Reveal jawab</button>
              <button className="btn" onClick={() => act("next")}>Agla sawal</button>
              <button className="btn paper" onClick={() => act("finish")}>Finish / Podium</button>
            </div>
            <h3 style={{ marginTop: 18 }}>Live controls</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              {status?.paused ? (
                <button className="btn red" onClick={() => act("resume")}>▶ Resume quiz</button>
              ) : (
                <button className="btn blue" onClick={() => act("pause")}>⏸ Pause quiz</button>
              )}
              <button className="btn" onClick={() => act("skip")}>⏭ Skip sawal</button>
              <button
                className="btn paper"
                onClick={() => { if (confirm("Quiz abhi khatam kar dein? Seedha podium khul jayega.")) act("finish"); }}
              >
                🏁 End quiz abhi
              </button>
            </div>
            {status?.participants && status.participants.length > 0 && (
              <div>
                <h3 style={{ marginTop: 18 }}>Players — galat/bina-naam wale ko hatao</h3>
                <table className="board">
                  <thead>
                    <tr><th>Player</th><th>Score</th><th></th></tr>
                  </thead>
                  <tbody>
                    {status.participants.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name} <span className="muted">({p.phone})</span></td>
                        <td>{p.score}</td>
                        <td style={{ width: 52 }}>
                          <button
                            className="btn paper"
                            style={{ padding: "2px 10px" }}
                            title={`${p.name} ko hatao`}
                            aria-label={`${p.name} ko hatao`}
                            onClick={() => removePlayer(p)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: 14 }}>
              <button className="btn paper" onClick={doExport}>Participants export</button>{" "}
              <Link className="btn paper" href={`/report?pin=${encodeURIComponent(pin)}`}>Proof report kholo</Link>
            </p>
            <p>
              <button className="btn paper" onClick={() => { if (confirm("Room saaf kar dein? Saare players aur scores hat jayenge. PIN wahi rahega.")) act("clear"); }}>
                Room clear karo
              </button>
            </p>
            {exportText && (
              <div>
                <h3>Participants (rank · naam · phone · score)</h3>
                <pre style={{ whiteSpace: "pre-wrap", border: "3px solid var(--ink)", background: "#fff", padding: 12 }}>{exportText}</pre>
                <p>
                  <button className="btn" onClick={async () => { await navigator.clipboard.writeText(exportText); setCopied(true); }}>
                    {copied ? "Copy ho gaya ✓" : "List copy karo"}
                  </button>{" "}
                  <button className="btn blue" onClick={downloadCsv}>CSV download</button>
                </p>
                <p className="muted">Yehi list Google Form me daalni hai — proof ke liye.</p>
              </div>
            )}
          </>
        )}
        {msg && <div className="okmsg" style={{ marginTop: 14 }}>{msg}</div>}
        {err && <div className="err" style={{ marginTop: 14 }}>{err}</div>}
      </section>
      <p className="muted center">Hosted by Vitthal Diwedi · Chance to Win Free Passes for Day 1</p>
    </main>
  );
}
