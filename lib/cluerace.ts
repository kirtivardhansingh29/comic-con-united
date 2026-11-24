// Clue Race — "Kaun Hai Ye?" character bank — SERVER SIDE ONLY.
// Same rule as the quiz bank: the correct index must never reach a browser
// before the reveal phase. Each round has 3 clues, hardest first and the
// giveaway last; locking an answer early scores more (see CLUE_POINTS in
// lib/store.ts: clue 1 = 1000, clue 2 = 700, clue 3 = 400).

export interface ClueRound {
  clues: [string, string, string];
  options: string[];
  correct: number; // index into options
}

export const CLUE_ROUNDS: ClueRound[] = [
  {
    clues: [
      "Is hero ko ek radioactive jaanwar ne kaata tha.",
      "Ye deewaron par chadh sakta hai aur jaala (web) chalata hai.",
      "“With great power comes great responsibility” — ye iske Uncle Ben ki seekh hai.",
    ],
    options: ["Spider-Man", "Batman", "Iron Man", "Ant-Man"],
    correct: 0,
  },
  {
    clues: [
      "Is ninja ke shareer me ek 9-poonchh wala janwar (Nine-Tails) band hai.",
      "Iska sapna apne gaon ka Hokage banna hai.",
      "Ramen iska sabse pasandeeda khana hai aur ye “Believe it!” kehta hai.",
    ],
    options: ["Goku", "Naruto", "Luffy", "Sasuke"],
    correct: 1,
  },
  {
    clues: [
      "Inka dimag computer se bhi tez chalta hai.",
      "Inke saathi ka naam Sabu hai, jo Jupiter grah se aaya hai.",
      "Ye Diamond Comics ke buddhe chacha hain jo har case buddhi se suljhate hain.",
    ],
    options: ["Chacha Chaudhary", "Suppandi", "Shikari Shambhu", "Billu"],
    correct: 0,
  },
  {
    clues: [
      "Ye 22nd century se aaya ek neela robot hai.",
      "Isko chuho se bahut darr lagta hai, kyunki unhone iske kaan kha liye the.",
      "Iske pet ki 4D jeb se koi bhi gadget nikal sakta hai.",
    ],
    options: ["Shinchan", "Doraemon", "Nobita", "Pikachu"],
    correct: 1,
  },
  {
    clues: [
      "Ye Saiyan grah se aaya hai aur bachpan me iski poonchh thi.",
      "Ye Dragon Balls jama karke wish maangta hai.",
      "Kamehameha iska sabse mashhoor attack hai.",
    ],
    options: ["Vegeta", "Naruto", "Goku", "Luffy"],
    correct: 2,
  },
  {
    clues: [
      "Is hero ke paas koi superpower nahi hai — sirf paisa, dimag aur training.",
      "Ye Gotham City ka rakshak hai aur iske butler ka naam Alfred hai.",
      "Ye chamgadar (bat) ka symbol pehenta hai aur Batmobile chalata hai.",
    ],
    options: ["Iron Man", "Batman", "Spider-Man", "Superman"],
    correct: 1,
  },
  {
    clues: [
      "Ye Bharat ka pehla TV superhero hai.",
      "Isko apni shaktiyaan saat rishiyon se mili hain aur ye gol ghoomkar roop badalta hai.",
      "Iska asal naam Pandit Gangadhar hai — “Sorry Shaktimaan!”",
    ],
    options: ["Nagraj", "Shaktimaan", "Dhruva", "Krishna"],
    correct: 1,
  },
  {
    clues: [
      "Isne ek Devil Fruit khaya tha jisse iska shareer rubber jaisa ban gaya.",
      "Ye hamesha ek taat (straw) wali topi pehenta hai.",
      "Ye Pirate King banna chahta hai aur One Piece dhoondh raha hai.",
    ],
    options: ["Naruto", "Goku", "Luffy", "Zoro"],
    correct: 2,
  },
  {
    clues: [
      "Ye ek genius billionaire hai jo apne haathon se high-tech suit banata hai.",
      "Iske seene me ek chamakta hua Arc Reactor hai.",
      "Iska asal naam Tony Stark hai aur ye Avengers ka hissa hai.",
    ],
    options: ["Batman", "Iron Man", "Thor", "Hulk"],
    correct: 1,
  },
  {
    clues: [
      "Iske shareer me hazaron saanp rehte hain.",
      "Ye Raj Comics ka sabse purana aur mashhoor hero hai.",
      "Iska asal naam Raj hai aur ye saanpon ki shaktiyon ka malik hai.",
    ],
    options: ["Dhruva", "Doga", "Nagraj", "Bankelal"],
    correct: 2,
  },
];
