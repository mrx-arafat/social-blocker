// Feed-blocking content script (plain script — no ES modules in content scripts).
// Toggles classes on <html> so feeds.css can hide infinite-scroll surfaces,
// and redirects dedicated Reels/Shorts pages back to the main site.

(function () {
  const SETTINGS_KEY = "sb_settings";
  const DEFAULT_FEEDS = {
    instagramReels: true,
    youtubeShorts: true,
    facebookReels: true,
    xForYou: false
  };

  const host = location.hostname.replace(/^www\./, "");
  const root = document.documentElement;

  function isHost(d) {
    return host === d || host.endsWith("." + d);
  }

  function apply(settings) {
    const enabled = settings.enabled !== false;
    const feeds = Object.assign({}, DEFAULT_FEEDS, settings.feeds || {});

    root.classList.toggle(
      "sb-ig-reels",
      enabled && feeds.instagramReels && isHost("instagram.com")
    );
    root.classList.toggle(
      "sb-yt-shorts",
      enabled && feeds.youtubeShorts && isHost("youtube.com")
    );
    root.classList.toggle(
      "sb-fb-reels",
      enabled && feeds.facebookReels && isHost("facebook.com")
    );
    root.classList.toggle(
      "sb-x-foryou",
      enabled &&
        feeds.xForYou &&
        (isHost("twitter.com") || isHost("x.com"))
    );

    maybeRedirect(enabled, feeds);
  }

  // Send users away from dedicated full-screen scroll pages.
  function maybeRedirect(enabled, feeds) {
    if (!enabled) return;
    const path = location.pathname;
    if (
      feeds.youtubeShorts &&
      isHost("youtube.com") &&
      path.startsWith("/shorts")
    ) {
      location.replace("https://www.youtube.com/");
    } else if (
      feeds.instagramReels &&
      isHost("instagram.com") &&
      /^\/reels?\//.test(path)
    ) {
      location.replace("https://www.instagram.com/");
    }
  }

  function load() {
    chrome.storage.local.get(SETTINGS_KEY, (got) => {
      apply(got[SETTINGS_KEY] || {});
    });
  }

  // React to settings changes live.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SETTINGS_KEY]) {
      apply(changes[SETTINGS_KEY].newValue || {});
    }
  });

  // Re-run on SPA navigations (YouTube/Instagram/X are single-page apps).
  const fire = () => window.dispatchEvent(new Event("sb:locationchange"));
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function () {
      const r = orig.apply(this, arguments);
      fire();
      return r;
    };
  }
  window.addEventListener("popstate", fire);
  window.addEventListener("sb:locationchange", load);

  load();
})();
