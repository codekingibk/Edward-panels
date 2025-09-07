// index.js
const quotes = [
  "Believe you can and you're halfway there.",
  "Do something today that your future self will thank you for.",
  "Don't watch the clock; do what it does. Keep going.",
  "It always seems impossible until it’s done.",
  "Dream bigger. Do bigger.",
  "Push yourself, because no one else is going to do it for you."
];

// Pick a random quote
const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

// Add a little ASCII art for fun
console.log("✨✨✨ MOTIVATION BOOST ✨✨✨\n");
console.log("💡 " + randomQuote + "\n");
console.log("🚀 Go make it happen!\n");