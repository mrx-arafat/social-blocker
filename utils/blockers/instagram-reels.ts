import type { BlockerConfig } from "../types";

export const instagramReelsBlocker: BlockerConfig = {
  id: "instagram-reels",
  name: "Instagram Reels",
  description: "Block all Instagram Reels content, navigation, and suggestions",
  icon: "📵",
  urlPatterns: [
    "*://www.instagram.com/reels*",
    "*://www.instagram.com/reel/*",
    "*://www.instagram.com/*/reels*",
    "*://instagram.com/reels*",
    "*://instagram.com/reel/*",
    "*://instagram.com/*/reels*",
  ],
  cssSelectors: [
    // Navigation links pointing to reels
    'a[href*="/reels"]',
    'a[href*="/reel/"]',
    // Hide the reels nav icon container (parent of the link)
    'a[href*="/reels/"]',
  ],
  urlMatchPatterns: [
    /^https?:\/\/(www\.)?instagram\.com\/reels\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/.+/,
    /^https?:\/\/(www\.)?instagram\.com\/[^/]+\/reels\/?/,
  ],
  enabled: true,
};
