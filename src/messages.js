// Persuasive, reactance-safe pause-screen lines. Factual cost framing only —
// the message informs, the choice stays with the user. Never shaming.

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

function nth(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return n + "th";
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}

// Fixed priority: streak-at-risk > trigger-hour match > 3rd+ visit today >
// weekly cost (>2h) > reclaimed habit > generic reflection.
// ctx: { domain, visitsToday, minutesToday, minutesWeek, streak,
//        reclaimedWeekMin, stepAwaysWeek, worstHour, nowHour }
export function pickMessage(ctx, rand = Math.random) {
  if (ctx.streak >= 2) {
    return `${ctx.streak}-day calm streak. Continuing may end today's.`;
  }
  if (ctx.worstHour != null && ctx.worstHour === ctx.nowHour) {
    const h12 = ((ctx.worstHour + 11) % 12) + 1;
    const ap = ctx.worstHour >= 12 ? "PM" : "AM";
    return `${h12} ${ap} is your weakest hour — you usually open ${ctx.domain} around now.`;
  }
  if (ctx.visitsToday >= 3) {
    return `${nth(ctx.visitsToday)} visit today — ${fmtH(ctx.minutesToday)} on ${ctx.domain} so far.`;
  }
  if (ctx.minutesWeek > 120) {
    return `This week: ${fmtH(ctx.minutesWeek)} on ${ctx.domain}. That's a movie and a walk.`;
  }
  if (ctx.stepAwaysWeek >= 3 && ctx.reclaimedWeekMin > 0) {
    return `You've stepped away ${ctx.stepAwaysWeek} times this week — about ${fmtH(ctx.reclaimedWeekMin)} reclaimed.`;
  }
  const generic = [
    "Was this open a decision, or a reflex?",
    "What were you doing 30 seconds ago?",
    "The feed will be the same in an hour.",
    "You can always come back on purpose."
  ];
  return generic[Math.floor(rand() * generic.length)];
}
