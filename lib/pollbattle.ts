// Janta Poll Battle — VS pairs bank. There is no "correct" answer here:
// the crowd decides. The majority side at close scores +100 per voter
// (see POLL_POINTS in lib/store.ts).

export interface PollPair {
  a: string;
  b: string;
}

export const POLL_PAIRS: PollPair[] = [
  { a: "Goku", b: "Naruto" },
  { a: "Batman", b: "Iron Man" },
  { a: "Doraemon", b: "Shinchan" },
  { a: "Shaktimaan", b: "Chhota Bheem" },
  { a: "Spider-Man", b: "Deadpool" },
  { a: "Luffy", b: "Goku" },
  { a: "Thor", b: "Hulk" },
  { a: "Chacha Chaudhary", b: "Suppandi" },
];
