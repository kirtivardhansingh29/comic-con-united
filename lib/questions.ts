// Live Quiz question bank — SERVER SIDE ONLY.
// This module must never be imported by a client component: it holds the
// answer keys. The /api/state route strips `correct` before anything
// reaches a browser, and only reveals it during the reveal phase.

export interface Question {
  category: string;
  text: string;
  options: string[];
  correct: number; // index into options
}

export const QUESTIONS: Question[] = [
  // --- Emoji Pehchano ---
  {
    category: "Emoji Pehchano",
    text: "🕷️ 🕸️ 🧑 — ye hero kaun hai?",
    options: ["Spider-Man", "Batman", "Iron Man", "Ant-Man"],
    correct: 0,
  },
  {
    category: "Emoji Pehchano",
    text: "🐲 🔮 ⭐ — ye series kaun si hai?",
    options: ["Naruto", "Dragon Ball", "Pokemon", "Beyblade"],
    correct: 1,
  },
  {
    category: "Emoji Pehchano",
    text: "🍜 🦊 👦 — ye ninja kaun hai?",
    options: ["Goku", "Luffy", "Naruto", "Shinchan"],
    correct: 2,
  },
  // --- Nerd Quiz ---
  {
    category: "Nerd Quiz",
    text: "Nagraj ka asal naam kya hai?",
    options: ["Vishal", "Raj", "Suraj", "Nagendra"],
    correct: 1,
  },
  {
    category: "Nerd Quiz",
    text: "Batman ka asal naam kya hai?",
    options: ["Clark Kent", "Peter Parker", "Tony Stark", "Bruce Wayne"],
    correct: 3,
  },
  {
    category: "Nerd Quiz",
    text: "Thor ke hathode ka naam kya hai?",
    options: ["Stormbreaker", "Gungnir", "Mjolnir", "Aegis"],
    correct: 2,
  },
  {
    category: "Nerd Quiz",
    text: "Doraemon kis century se aaya hai?",
    options: ["20th century", "21st century", "22nd century", "25th century"],
    correct: 2,
  },
  // --- Sach Ya Jhooth ---
  {
    category: "Sach Ya Jhooth",
    text: "Sach ya Jhooth: Doraemon ko billiyon se darr lagta hai.",
    options: ["Sach", "Jhooth"],
    correct: 1, // he is afraid of mice, not cats
  },
  {
    category: "Sach Ya Jhooth",
    text: "Sach ya Jhooth: Chacha Chaudhary ka saathi Sabu Jupiter grah se aaya hai.",
    options: ["Sach", "Jhooth"],
    correct: 0,
  },
  {
    category: "Sach Ya Jhooth",
    text: "Sach ya Jhooth: MCU ki sabse pehli film Iron Man (2008) hai.",
    options: ["Sach", "Jhooth"],
    correct: 0,
  },
  // --- Ulta-Pulta Naam ---
  {
    category: "Ulta-Pulta Naam",
    text: "JARGAN ko sudharo — hero ka sahi naam kya hai?",
    options: ["Jangar", "Nagraj", "Rajang", "Gargan"],
    correct: 1,
  },
  {
    category: "Ulta-Pulta Naam",
    text: "UKGO ko sudharo — hero ka sahi naam kya hai?",
    options: ["Kogu", "Gouku", "Goku", "Kugo"],
    correct: 2,
  },
  // --- Dialogue Pura Karo ---
  {
    category: "Dialogue Pura Karo",
    text: "“Don ko pakadna mushkil hi nahi, ________ hai!”",
    options: ["Aasaan", "Naamumkin", "Zaroori", "Timepass"],
    correct: 1,
  },
  {
    category: "Dialogue Pura Karo",
    text: "Motu Patlu: “Khali pet mere dimag ki ________ nahi jalti.”",
    options: ["Light", "Tube", "Batti", "Bijli"],
    correct: 2,
  },
  {
    category: "Nerd Quiz",
    text: "Avengers: Endgame me Thanos ke Infinity Gauntlet me kul kitne Infinity Stones the?",
    options: ["4", "5", "6", "7"],
    correct: 2,
  },
];
