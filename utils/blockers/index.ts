import type { BlockerConfig } from "../types";
import { instagramReelsBlocker } from "./instagram-reels";
import { youtubeShortsBlocker } from "./youtube-shorts";

const blockerRegistry: BlockerConfig[] = [
  instagramReelsBlocker,
  youtubeShortsBlocker,
];

export function getAllBlockers(): BlockerConfig[] {
  return blockerRegistry;
}

export function getBlockerById(id: string): BlockerConfig | undefined {
  return blockerRegistry.find((b) => b.id === id);
}

export function isReelsUrl(url: string): boolean {
  return instagramReelsBlocker.urlMatchPatterns.some((pattern) =>
    pattern.test(url),
  );
}

export function isShortsUrl(url: string): boolean {
  return youtubeShortsBlocker.urlMatchPatterns.some((pattern) =>
    pattern.test(url),
  );
}
