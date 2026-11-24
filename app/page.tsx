import Link from "next/link";

const CHARS = [
  { img: "/chars/nagraj.jpg", name: "Nagraj", line: "Shareer me saanp, seene me desh-bhakti ki aag.", tag: "Raj Comics" },
  { img: "/chars/dhruva.jpg", name: "Super Commando Dhruva", line: "Koi superpower nahi — sirf dimag, training aur himmat.", tag: "Raj Comics" },
  { img: "/chars/chacha.jpg", name: "Chacha Chaudhary", line: "Dimag computer se bhi tez chalta hai.", tag: "Diamond Comics" },
  { img: "/chars/shaktimaan.jpg", name: "Shaktimaan", line: "Bharat ka pehla superhero — satya ka rakshak.", tag: "Desi TV legend" },
  { img: "/chars/spiderman.jpg", name: "Spider-Man", line: "With great power comes great responsibility.", tag: "Marvel" },
  { img: "/chars/batman.jpg", name: "Batman", line: "Gotham ki raaton ka khamosh rakshak.", tag: "DC" },
  { img: "/chars/goku.jpg", name: "Goku", line: "Har limit todne wala Saiyan yoddha.", tag: "Anime · Dragon Ball" },
  { img: "/chars/doraemon.jpg", name: "Doraemon", line: "4D pocket me har problem ka gadget.", tag: "Anime" },
];

export default function Home() {
  return (
    <main className="wrap">
      {/* ---------- HERO: comic cover ---------- */}
      <section className="panel hero">
        <div className="issue">
          <span>Issue #01</span>
          <span>·</span>
          <span>50 fans</span>
          <span>·</span>
          <span>1 mauka</span>
          <span style={{ marginLeft: "auto" }}>Online edition</span>
        </div>
        <h1 className="display">Comic Con United</h1>
        <p style={{ fontSize: "1.1rem", maxWidth: 640 }}>
          Ek live online quiz, pure fandom ke liye. Phone uthao, naam daalo, aur 50 nerds ke
          saath ek saath khelo — bilkul Metro ki tarah fast, aur chai ki tarah garam competition.
        </p>
        <p>
          <span className="chip yellow">Hosted by Vitthal Diwedi</span>
          <span className="chip">Live quiz</span>
          <span className="chip">Top 3 podium</span>
        </p>
      </section>

      <div className="event-strip">DELHI COMIC CON 2026 · 5–6 DEC · NSIC GROUNDS, OKHLA</div>
      <div className="prize-strip">Chance to Win Free Passes for Day 1</div>

      {/* ---------- MODES ---------- */}
      <div className="mode-grid">
        <Link href="/live" className="panel mode-card yellow">
          <h3>Live Quiz</h3>
          <p>
            Sabke phone par ek saath sawal, 20 second ka timer, tez jawab = zyada points.
            Host ke start karte hi game live ho jata hai.
          </p>
          <span className="btn red">Quiz join karo</span>
        </Link>
        <Link href="/arena" className="panel mode-card">
          <h3>Arena mode</h3>
          <p>
            Ek hi device par host-run games — doston ko bulao, naam jodo, rounds khelo aur
            scoreboard par raja bano. Bina internet-jhanjhat ke.
          </p>
          <span className="btn blue">Arena kholo</span>
        </Link>
      </div>

      <p className="muted center">
        Host ho? <Link href="/host">Host panel yahan hai</Link> — PIN se control, export aur
        officials ke liye proof report.
      </p>

      {/* ---------- CHARACTERS ---------- */}
      <section className="panel">
        <h2 style={{ fontSize: "1.9rem" }}>Aaj ke heroes</h2>
        <p className="muted">Quiz ke sawal inhi duniyaon se aayenge — taiyaar rehna.</p>
        <div className="char-grid">
          {CHARS.map((c) => (
            <article className="panel char-card" key={c.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt={c.name} loading="lazy" />
              <div className="cc-body">
                <h3>{c.name}</h3>
                <p>{c.line}</p>
                <span className="chip">{c.tag}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- EVENT DETAILS ---------- */}
      <section className="panel">
        <h2 style={{ fontSize: "1.9rem" }}>Event details</h2>
        <p>
          <strong>Delhi Comic Con 2026</strong> — Saturday 5 to Sunday 6 December 2026,
          NSIC Exhibition Grounds, Okhla, New Delhi. Nearest metro: Okhla NSIC (Magenta Line) —
          India Gate se seedhi Metro pakdo, Okhla utro. Gates 11:00 AM onwards. Organiser:
          NODWIN Gaming.
        </p>
        <h3 style={{ fontSize: "1.2rem" }}>Passes</h3>
        <p>
          <span className="chip yellow">Single Day — ₹1,199</span>
          <span className="chip">Crunchyroll Power Pass — ₹1,574 / day</span>
          <span className="chip">Superfan — ₹3,499 (both days + goodies box)</span>
        </p>
        <h3 style={{ fontSize: "1.2rem" }}>Entry rules</h3>
        <p>
          E-ticket ke saath photo ID zaroor lao. Wristband box office par milega — wo salamat
          raha to re-entry chalegi. 3 saal se upar ke bachchon ko apna pass lagega. Passes
          non-transferable aur non-refundable hain.
        </p>
        <div className="panel" style={{ boxShadow: "5px 5px 0 var(--ink)", marginBottom: 0 }}>
          {/* Official logo shown as event information only — never as our branding. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/comic-con-india-logo.png"
            alt="Comic Con India official logo"
            style={{ width: 220, maxWidth: "70%", display: "block", marginBottom: 8 }}
          />
          <strong>Official Event Logo · Sirf Jaankari Ke Liye</strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            Ye logo asal event ki pehchan ke liye dikhaya gaya hai. Comic Con United ek
            fan activity hai — ye uski branding nahi hai.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/delhi-comic-con-logo.png"
            alt="Delhi Comic Con official logo"
            style={{ width: 340, maxWidth: "100%", display: "block", marginBottom: 8, marginTop: 16 }}
          />
          <strong>Delhi Comic Con — Official Event Logo · Sirf Jaankari Ke Liye</strong>
        </div>
      </section>

      <footer className="site">
        <p>
          <strong>Comic Con United</strong> — Hosted by Vitthal Diwedi. Chance to Win Free
          Passes for Day 1 — Top 3 players ko mauka milega, guarantee kisi ki nahi.
        </p>
        <p className="muted">
          Ye ek fan activity hai, Comic Con India ka official event nahi hai. Event ki sahi
          jaankari ke liye comicconindia.com dekho.
        </p>
      </footer>
    </main>
  );
}
