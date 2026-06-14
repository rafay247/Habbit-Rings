export const DAILY_QUOTES: string[] = [
  "You may delay, but time will not. — Benjamin Franklin",
  "The accountability mirror doesn't lie. It's your first step towards growth.",
  "The hardest battle you will fight is the battle to be yourself in a world that is trying to make you like everyone else.",
  "Confidence comes not from always being right but from not fearing to be wrong. — Peter T. McIntyre",
  "We suffer more often in imagination than in reality. — Seneca",
  "You have power over your mind—not outside events. Realize this, and you will find strength. — Marcus Aurelius",
  "Argue for your limitations, and sure enough, they're yours. — Richard Bach",
  "Whether you think you can, or you think you can't—you're right. — Henry Ford",
  "No man is free who is not master of himself. — Epictetus",
  "To be honest, speak without identity. — Naval Ravikant",
  "First say to yourself what you would be; and then do what you have to do. — Epictetus",
  "Everything in life happens twice — first in your mind, and then in reality.",
  "Your 'why' is your fuel—it's what keeps you going when things get tough.",
  "Problem is the part of life and dealing it is the art of life.",
  "He who has a why to live for can bear almost any how. — Friedrich Nietzsche",
  "Desire is a contract that you make with yourself to be unhappy until you get what you want. — Naval Ravikant",
  "A fit body, a calm mind, a house full of love. These things cannot be bought—they must be earned. — Naval Ravikant",
  "Success is stumbling from failure to failure with no loss of enthusiasm. — Winston Churchill",
  "Do what you can, with what you have, where you are. — Theodore Roosevelt",
  "The greatest superpower is the ability to change yourself. — Naval Ravikant",
  "If you're going through hell, keep going. — Winston Churchill",
  "When you feel like giving up, remember you still have 60% of your strength left in you. Keep going.",
  "Raise your hand… now raise it a little higher. Then ask yourself — why didn't you give your 100% the first time?",
  "Discipline equals freedom. — Jocko Willink",
  "Motivation is what gets you started. Habit is what keeps you going. — Jim Ryun",
  "Don't stop when you're tired. Stop when you're done. — David Goggins",
  "Action is the foundational key to all success. — Pablo Picasso",
  "Knowing is not enough; we must apply. Willing is not enough; we must do. — Johann Wolfgang von Goethe",
  "Amateurs sit and wait for inspiration, the rest of us just get up and go to work. — Stephen King",
  "Waste no more time arguing what a good man should be. Be one. — Marcus Aurelius",
  "Inspiration is perishable. Act on it immediately. — Naval Ravikant",
  "Early progress is invisible.",
  "Every habit is a vote for the type of person you wish to be.",
  "There is no 'miracle moment.' Overnight success is usually the result of ten years of pushing the flywheel.",
  "Play iterated games. All the returns in life, whether in wealth, relationships, or knowledge, come from compound interest. — Naval Ravikant",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Will Durant",
  "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success. — Dwayne Johnson",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "Impatience with actions, patience with results. — Naval Ravikant",
  "The journey of a thousand miles begins with one step. — Lao Tzu",
  "Fall seven times and stand up eight. — Japanese Proverb",
  "Staying in denial may feel safe, but true growth begins when you step out of your comfort zone.",
  "What you're not changing, you're choosing. — Laurie Buchanan, PhD",
  "Procrastination is the thief of time. — Edward Young",
  "You may delay, but time will not. — Benjamin Franklin",
  "A year from now you may wish you had started today. — Karen Lamb",
  "Only put off until tomorrow what you are willing to die having left undone. — Pablo Picasso",
  "The scariest moment is always just before you start. — Stephen King",
  "The modern devil is cheap dopamine. — Naval Ravikant",
  "I find that the harder I work, the more luck I seem to have. — Thomas Jefferson",
  "Read what you love until you love to read. — Naval Ravikant",
  "Rich people focus on what they gain, not on what it costs.",
  "If you have the right people, you don't need to micromanage them. If you have the wrong people, the best strategy in the world won't save you.",
  "The best place to look for secrets is where no one else is looking—in the gaps between established disciplines.",
  "The most valuable businesses of the future will be the ones that solve problems in ways we haven't even imagined yet.",
  "Mediocrity hates excellence because excellence exposes mediocrity.",
  "Earn with your mind, not your time. — Naval Ravikant",
  "You're not going to get rich renting out your time. You must own equity to gain your financial freedom. — Naval Ravikant",
  "If you can't see yourself working with someone for life, don't work with them for a day. — Naval Ravikant",
  "Specific knowledge is found by pursuing your genuine curiosity and passion rather than whatever is hot right now. — Naval Ravikant",
  "Learn to sell. Learn to build. If you can do both, you will be unstoppable. — Naval Ravikant"
];

export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export interface Quote { text: string; author: string; }

export function getDailyQuote(): Quote {
  let customQuotes: Quote[] = [];
  try {
    const raw = localStorage.getItem("habit-rings-custom-quotes");
    if (raw) customQuotes = JSON.parse(raw);
  } catch {}
  if (customQuotes && customQuotes.length > 0) {
    return customQuotes[dayOfYear() % customQuotes.length];
  }
  const raw = DAILY_QUOTES[dayOfYear() % DAILY_QUOTES.length];
  const sep = " \u2014 ";
  const pos = raw.indexOf(sep);
  if (pos !== -1) {
    return { text: raw.slice(0, pos).trim(), author: raw.slice(pos + sep.length).trim() };
  }
  return { text: raw, author: "" };
}
