import type { BlockerConfig } from "../types";

export const youtubeShortsBlocker: BlockerConfig = {
  id: "youtube-shorts",
  name: "YouTube Shorts",
  description: "Block all YouTube Shorts content, navigation, and suggestions",
  icon: "🚫",
  urlPatterns: [
    "*://www.youtube.com/shorts*",
    "*://www.youtube.com/shorts/*",
    "*://youtube.com/shorts*",
    "*://youtube.com/shorts/*",
  ],
  cssSelectors: [
    // Shorts links in navigation and feed
    'a[href="/shorts"]',
    'a[href^="/shorts/"]',
    // Shorts shelf on homepage
    "ytd-rich-shelf-renderer[is-shorts]",
    // Shorts reel shelf (homepage + search results)
    "ytd-reel-shelf-renderer",
    // Sidebar Shorts tab (full sidebar)
    'ytd-guide-entry-renderer:has(a[title="Shorts"])',
    // Mini sidebar Shorts tab
    'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
  ],
  urlMatchPatterns: [
    /^https?:\/\/(www\.)?youtube\.com\/shorts(\/.*)?$/,
  ],
  enabled: true,
};
