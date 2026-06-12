// Mascot mood engine + mount helper. The koala is a buddy, not a cop —
// upset on guarded sites, celebrating wins, never shaming (same contract
// as messages.js).

export const MASCOT_ICONS = {
  angry: "icons/mascot/angry.svg",
  cool: "icons/mascot/cool.svg",
  heartEyes: "icons/mascot/heart-eyes.svg",
  party: "icons/mascot/party.svg",
  confused: "icons/mascot/confused.svg",
  working: "icons/mascot/working.svg",
  playing: "icons/mascot/playing.svg",
  mad: "icons/mascot/mad.svg"
};

export const DEFAULT_MASCOT_NAME = "Koby";

// Priority, high to low:
//   events       — milestone (party), step-away win (heart-eyes), deciding (confused)
//   off duty     — protection is disabled, so the koala is just playing
//   on a site    — mad past 20 min today, otherwise angry
//   streak tiers — 7+ adoring (heart-eyes), 3+ diligent (working), else chill (cool)
// ctx: { event, offDuty, onSocialSite, streak, minutesToday, domain }
export function pickMood(ctx) {
  if (ctx.event === "milestone") return "party";
  if (ctx.event === "stepAway") return "heartEyes";
  if (ctx.event === "deciding") return "confused";
  if (ctx.offDuty) return "playing";
  if (ctx.onSocialSite) return ctx.minutesToday >= 20 ? "mad" : "angry";
  if (ctx.streak >= 7) return "heartEyes";
  if (ctx.streak >= 3) return "working";
  return "cool";
}

const LINES = {
  stepAway: [
    "That's it! Proud of you, buddy.",
    "Time reclaimed. You're doing great.",
    "Nice. The feed loses, you win.",
    "See? You didn't need it. Proud of you."
  ],
  coolIdle: [
    "All quiet. I like quiet.",
    "No doomscrolling on my watch.",
    "Eucalyptus and peace. Living the dream.",
    "You good? I'm good."
  ],
  heartEyesIdle: [
    "You've been amazing lately.",
    "Look at you, all focused and stuff.",
    "My favourite human, honestly."
  ],
  angryMild: [
    "Hey. We talked about this.",
    "Really? This site again?",
    "I'm watching you scroll. Just saying.",
    "You said you'd be quick. Clock's ticking."
  ],
  confused: [
    "Wait… do you actually need this?",
    "Hmm. What were you doing a minute ago?",
    "You sure? You don't look sure.",
    "I'm confused. Was this a decision or a reflex?"
  ],
  working: [
    "Heads down. We're getting things done.",
    "Look at us, being productive.",
    "Focus mode. I'm right here with you.",
    "Keep it up — momentum looks good on you."
  ],
  playing: [
    "Off duty! Guess we're playing now.",
    "Protection's off, so… wheee?",
    "No rules right now. Don't make me regret it.",
    "I'll be over here goofing off till you're back."
  ]
};

function fmtMin(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

function pick(pool, rand) {
  return pool[Math.floor(rand() * pool.length)];
}

// What the koala says for a mood. The mad line calls out the time sunk into
// the site today — factual, not shaming.
export function mascotLine(mood, ctx, rand = Math.random) {
  if (ctx.event === "stepAway") return pick(LINES.stepAway, rand);
  if (ctx.event === "milestone") {
    return `${ctx.streak} calm days in a row! That's my human!`;
  }
  if (mood === "mad") {
    return `${fmtMin(ctx.minutesToday)} on ${ctx.domain} today. Okay, now I'm mad.`;
  }
  if (mood === "confused") return pick(LINES.confused, rand);
  if (mood === "angry") return pick(LINES.angryMild, rand);
  if (mood === "working") return pick(LINES.working, rand);
  if (mood === "playing") return pick(LINES.playing, rand);
  if (mood === "heartEyes") return pick(LINES.heartEyesIdle, rand);
  return pick(LINES.coolIdle, rand);
}

// Build the koala DOM inside `host`: <img> + name tag + optional bubble.
// Pages pass their own relative icon base (""), the overlay passes
// chrome.runtime.getURL("").
export function renderMascot(host, { mood, line, name, iconBase = "" }) {
  host.innerHTML = "";
  host.classList.add("sb-mascot");

  if (line) {
    const bubble = document.createElement("div");
    bubble.className = "sb-mascot-bubble";
    bubble.textContent = line;
    host.appendChild(bubble);
  }

  const img = document.createElement("img");
  img.className = "sb-mascot-img";
  img.alt = name || DEFAULT_MASCOT_NAME;
  img.src = iconBase + MASCOT_ICONS[mood];
  host.appendChild(img);

  const tag = document.createElement("div");
  tag.className = "sb-mascot-name";
  tag.textContent = name || DEFAULT_MASCOT_NAME;
  host.appendChild(tag);
  return host;
}
