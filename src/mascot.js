// Mascot mood engine + mount helper. The koala is a buddy, not a cop —
// upset on guarded sites, celebrating wins, never shaming (same contract
// as messages.js).

export const MASCOT_ICONS = {
  angry: "icons/mascot/angry.svg",
  cool: "icons/mascot/cool.svg",
  heartEyes: "icons/mascot/heart-eyes.svg"
};

export const DEFAULT_MASCOT_NAME = "Koby";

// Win events override everything; being on a guarded site trumps streak
// pride; a healthy streak earns heart-eyes; otherwise chill.
// ctx: { event, onSocialSite, streak, minutesToday, domain }
export function pickMood(ctx) {
  if (ctx.event === "stepAway" || ctx.event === "milestone") return "heartEyes";
  if (ctx.onSocialSite) return "angry";
  if (ctx.streak >= 3) return "heartEyes";
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
  ]
};

function fmtMin(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

function pick(pool, rand) {
  return pool[Math.floor(rand() * pool.length)];
}

// What the koala says for a mood. Angry escalates once the visit stops
// being "quick" (20+ minutes today on this site).
export function mascotLine(mood, ctx, rand = Math.random) {
  if (ctx.event === "stepAway") return pick(LINES.stepAway, rand);
  if (ctx.event === "milestone") {
    return `${ctx.streak} calm days in a row! That's my human!`;
  }
  if (mood === "angry") {
    if (ctx.minutesToday >= 20) {
      return `${fmtMin(ctx.minutesToday)} on ${ctx.domain} today. I'm not mad. Okay, I'm a little mad.`;
    }
    return pick(LINES.angryMild, rand);
  }
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
