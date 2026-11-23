// Arena mode content — fully local, host-run on one device.
// Answers live here on purpose: the host reveals them on the same screen.

export interface ArenaItem {
  prompt: string;
  answer: string;
  hint?: string;
}

export interface ArenaRound {
  id: string;
  name: string;
  tagline: string;
  points: number; // points for a correct answer in this round
  items: ArenaItem[];
}

export const ARENA_ROUNDS: ArenaRound[] = [
  {
    id: "emoji",
    name: "Emoji Pehchano",
    tagline: "Emoji dekh, hero pehchan",
    points: 2,
    items: [
      { prompt: "🕷️ 🕸️", answer: "Spider-Man", hint: "Jaala phenkne wala" },
      { prompt: "🦇 🌃", answer: "Batman", hint: "Gotham ka rakshak" },
      { prompt: "🐲 🔮 ⭐", answer: "Dragon Ball", hint: "Saat gole ikatthe karo" },
      { prompt: "🍜 🦊 👦", answer: "Naruto", hint: "Ramen lover ninja" },
      { prompt: "⚡ 🐭", answer: "Pikachu", hint: "Bijli wala chuha" },
      { prompt: "🐱 🔔 🤖", answer: "Doraemon", hint: "Neeli robot billi" },
      { prompt: "🌞 💪 🦸", answer: "Shaktimaan", hint: "Bharat ka pehla superhero" },
      { prompt: "🐍 👑", answer: "Nagraj", hint: "Saampon ka raja" },
    ],
  },
  {
    id: "dialogue-guess",
    name: "Dialogue Guess",
    tagline: "Dialogue sun, character bata",
    points: 2,
    items: [
      { prompt: "“Chacha Chaudhary ka dimag computer se bhi tez chalta hai.”", answer: "Chacha Chaudhary", hint: "Laal pagdi wale chacha" },
      { prompt: "“I am Iron Man.”", answer: "Iron Man (Tony Stark)", hint: "Avengers ka sabse ameer aadmi" },
      { prompt: "“With great power comes great responsibility.”", answer: "Uncle Ben (Spider-Man)", hint: "Peter Parker ko mili seekh" },
      { prompt: "“Don ko pakadna mushkil hi nahi, naamumkin hai.”", answer: "Don", hint: "11 mulkon ki police peeche hai" },
      { prompt: "“Khali pet mere dimag ki batti nahi jalti.”", answer: "Patlu", hint: "Motu ka sabse patla dost" },
      { prompt: "“I am inevitable.”", answer: "Thanos", hint: "Ek chutki me aadhi duniya" },
      { prompt: "“Kamehameha!”", answer: "Goku", hint: "Saiyan ka sabse mashhoor hamla" },
      { prompt: "“Jab Sabu ko gussa aata hai, to jwalamukhi phat padta hai.”", answer: "Sabu", hint: "Jupiter se aaya dev" },
    ],
  },
  {
    id: "nerd-quiz",
    name: "Nerd Quiz",
    tagline: "Seedha sawal, seedha jawab",
    points: 3,
    items: [
      { prompt: "Nagraj ka asal naam kya hai?", answer: "Raj" },
      { prompt: "Super Commando Dhruva kis city me rehta hai?", answer: "Rajnagar" },
      { prompt: "Sabu kis grah se aaya hai?", answer: "Jupiter" },
      { prompt: "Batman kis city ka rakshak hai?", answer: "Gotham City" },
      { prompt: "Spider-Man ka asal naam kya hai?", answer: "Peter Parker" },
      { prompt: "Goku kis jaati (race) se hai?", answer: "Saiyan" },
      { prompt: "Doraemon ka favourite khana kya hai?", answer: "Dorayaki (Dora cakes)" },
      { prompt: "Shaktimaan ka aam-aadmi wala roop kaun sa hai?", answer: "Gangadhar" },
      { prompt: "Thor ke hathode ka naam kya hai?", answer: "Mjolnir" },
      { prompt: "Chacha Chaudhary ke kutte ka naam kya hai?", answer: "Rocket" },
    ],
  },
  {
    id: "sach-jhooth",
    name: "Sach Ya Jhooth",
    tagline: "Sach hai ya jhooth — batao",
    points: 2,
    items: [
      { prompt: "Doraemon chuho se darta hai.", answer: "Sach" },
      { prompt: "Nagraj ke shareer me saanp rehte hain.", answer: "Sach" },
      { prompt: "Batman ke paas superpower hai.", answer: "Jhooth — uske paas sirf dimag, paisa aur gadgets hain" },
      { prompt: "Chacha Chaudhary ki pagdi laal rang ki hai.", answer: "Sach" },
      { prompt: "Goku ek Saiyan hai.", answer: "Sach" },
      { prompt: "Shaktimaan ka show pehli baar 1997 me TV par aaya tha.", answer: "Sach" },
      { prompt: "Dhruva ke paas koi superpower nahi hai.", answer: "Sach — wo sirf apni training aur dimag par chalta hai" },
      { prompt: "Doraemon 22nd century se aaya hai.", answer: "Sach" },
      { prompt: "Nagraj ka asal naam Vishal hai.", answer: "Jhooth — uska naam Raj hai" },
      { prompt: "Batman Justice League ka member hai.", answer: "Sach" },
    ],
  },
  {
    id: "ulta-pulta",
    name: "Ulta-Pulta Naam",
    tagline: "Ulta naam, seedha karo",
    points: 3,
    items: [
      { prompt: "JARGAN", answer: "NAGRAJ" },
      { prompt: "UKGO", answer: "GOKU" },
      { prompt: "NAMTAB", answer: "BATMAN" },
      { prompt: "REDNAMSPI", answer: "SPIDERMAN" },
      { prompt: "VAHRUD", answer: "DHRUVA" },
      { prompt: "KAANAMITSH", answer: "SHAKTIMAAN" },
      { prompt: "NOREAMOD", answer: "DORAEMON" },
      { prompt: "HCAHCA", answer: "CHACHA" },
    ],
  },
  {
    id: "dialogue-pura",
    name: "Dialogue Pura Karo",
    tagline: "Adhoora dialogue, pura karo",
    points: 2,
    items: [
      { prompt: "“Don ko pakadna mushkil hi nahi, ________ hai!”", answer: "Naamumkin" },
      { prompt: "“Khali pet mere dimag ki ________ nahi jalti.”", answer: "Batti" },
      { prompt: "“Chacha Chaudhary ka dimag ________ se bhi tez chalta hai.”", answer: "Computer" },
      { prompt: "Thanos: “I am ________.”", answer: "Inevitable" },
      { prompt: "“With great power comes great ________.”", answer: "Responsibility" },
      { prompt: "Shaktimaan ka sabse bada dushman: ________ Kilvish", answer: "Tamraj" },
      { prompt: "Nobita: “Doraemon, koi ________ nikalo!”", answer: "Gadget" },
      { prompt: "Captain America: “Avengers, ________!”", answer: "Assemble" },
    ],
  },
];
