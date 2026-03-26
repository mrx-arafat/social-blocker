import type { BlockerConfig } from "../types";
import { instagramReelsBlocker } from "./instagram-reels";

const blockerRegistry: BlockerConfig[] = [instagramReelsBlocker];

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
