// Self-awareness prompts — break the autopilot
export const SELF_AWARENESS_PROMPTS = [
  "You were about to spend the next hour scrolling. Is that really what you want right now?",
  "Pause. What were you actually looking for? Or did your thumb just autopilot here?",
  "Before you scroll, ask yourself: will this make me feel better or worse in 30 minutes?",
  "You opened this out of habit, not need. That's the loop talking.",
  "Right now, someone you care about would rather hear from you than watch you scroll.",
  "This is the moment your future self will thank you for. You stopped.",
  "The urge to scroll will pass in about 10 seconds. Just breathe.",
  "You're not bored. You're avoiding something. What is it?",
];

// Anti-comparison quotes — challenge the highlight reel trap
export const ANTI_COMPARISON_QUOTES = [
  "Their highlight reel isn't their real life. You're comparing your behind-the-scenes to their best takes.",
  "Nobody posts their anxiety, their doubts, or their 3am worries. What you see is a performance.",
  "You don't need to perform being intellectual for anyone. Your real thoughts matter more than your reactions.",
  "The people who seem to have it all figured out are just better at hiding their mess.",
  "Scrolling through others' lives won't improve yours. Living yours will.",
  "You are not falling behind. You're on a completely different path.",
  "Comparison is the thief of joy. Your journey doesn't need an audience.",
  "Those 'perfect lives' have the same struggles you do — just different filters.",
];

// Self-worth quotes — you are enough without likes
export const SELF_WORTH_QUOTES = [
  "You don't need likes to be valuable. You never did.",
  "Your worth isn't measured in engagement. It never was.",
  "The most important things about you can't be captured in a story or a reel.",
  "You are more than your online presence. The real you doesn't need validation.",
  "Sharing reels to seem interesting? You're already interesting. You just forgot.",
  "The attention you seek online is a fraction of the attention you deserve from yourself.",
  "Stop performing. Start living. Nobody worth keeping needs a curated version of you.",
  "Your real connections don't need content. They need you.",
];

// Mindfulness quotes — be present
export const MINDFULNESS_QUOTES = [
  "Be present in your own life, not a spectator of others'.",
  "The best moments of your life will never be found on a screen.",
  "Right now is the only moment you actually have. Don't spend it watching someone else's.",
  "Put down the phone. Look around. This is your actual life happening.",
  "Every minute you scroll is a minute you'll never get back. Make it count.",
  "The world outside your screen is waiting. It's more beautiful than any reel.",
  "Boredom is where creativity begins. Don't numb it with content.",
  "You don't need more information. You need more presence.",
];

// Growth quotes — what you gain by stepping away
export const GROWTH_QUOTES = [
  "The hours you save today become the skills of tomorrow.",
  "Every reel you skip is a page you could read, a walk you could take, a friend you could call.",
  "Discipline isn't punishment. It's the ultimate act of self-respect.",
  "You're not giving something up. You're making room for something better.",
  "The discomfort of not scrolling is the feeling of growing.",
  "Small choices compound. Skipping one reel won't change your life. Skipping a thousand will.",
  "The person you want to become doesn't scroll for hours. Start being them now.",
  "Freedom isn't having access to everything. It's not being controlled by anything.",
];

// All quotes combined for random selection
export const ALL_QUOTES = [
  ...ANTI_COMPARISON_QUOTES,
  ...SELF_WORTH_QUOTES,
  ...MINDFULNESS_QUOTES,
  ...GROWTH_QUOTES,
];

// Time reality check templates
export const TIME_REALITY_CHECKS = [
  { threshold: 60, message: "That's enough time to read a chapter of a book." },
  {
    threshold: 120,
    message: "That's a full episode of your favorite show.",
  },
  {
    threshold: 300,
    message: "That's enough time to cook a real meal from scratch.",
  },
  {
    threshold: 600,
    message: "That's enough time to go for a solid walk outside.",
  },
  {
    threshold: 1800,
    message: "That's half an hour — you could have learned something new.",
  },
  {
    threshold: 3600,
    message: "That's a whole hour. You could have worked out, called a friend, or started a project.",
  },
];

export function getRandomQuote(): string {
  return ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];
}

export function getRandomPrompt(): string {
  return SELF_AWARENESS_PROMPTS[
    Math.floor(Math.random() * SELF_AWARENESS_PROMPTS.length)
  ];
}

export function getTimeRealityCheck(secondsSaved: number): string {
  const applicable = TIME_REALITY_CHECKS.filter(
    (t) => secondsSaved >= t.threshold,
  );
  if (applicable.length === 0) {
    return "Every second counts. You're building a better habit.";
  }
  return applicable[applicable.length - 1].message;
}

export function formatTimeSaved(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

// Average time per reel in seconds
export const SECONDS_PER_REEL = 30;
