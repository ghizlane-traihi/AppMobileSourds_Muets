/**
 * resolveLocalSigns
 *
 * Converts a gloss/transcribed text string into an ordered array of
 * SignAsset objects backed by LOCAL files from data/downloaded/.
 *
 * Lookup strategy (in order):
 *   1. Exact lowercase word          e.g. "hello"
 *   2. Word with spaces → hyphens    e.g. "a lot" → "a-lot"
 *   3. Suffix strip (plurals, -ing)  e.g. "running" → "run"
 *   4. null → fallback card shown by SignSequencePlayer
 */

import { resolveSignAsset } from "../data/signAssetMap";
import { SignAsset } from "../types";

// ─── Normalisation helpers ────────────────────────────────────────────────────

const normalizeWord = (raw: string): string =>
  raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Simple suffix stripping for common English inflections */
const tryStrip = (word: string): string[] => {
  const candidates: string[] = [];

  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    candidates.push(base, base + "e"); // running→run, writing→write
  }
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    candidates.push(base, base + "e"); // walked→walk, smiled→smile
  }
  if (word.endsWith("s") && word.length > 3) {
    candidates.push(word.slice(0, -1)); // cats→cat
  }
  if (word.endsWith("ly") && word.length > 4) {
    candidates.push(word.slice(0, -2)); // quickly→quick
  }

  return candidates;
};

// ─── Core lookup ─────────────────────────────────────────────────────────────

const lookupWord = (raw: string): { uri: string; type: "image" | "video" } | null => {
  const normalized = normalizeWord(raw);
  if (!normalized) return null;

  // 1. Exact match
  const exact = resolveSignAsset(normalized);
  if (exact) return exact;

  // 2. Hyphen variant (handles "a lot" → "a-lot" already via normalizeWord)
  //    No extra step needed — spaces become hyphens above.

  // 3. Suffix stripping
  for (const candidate of tryStrip(normalized)) {
    const stripped = resolveSignAsset(candidate);
    if (stripped) return stripped;
  }

  return null;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses `glossText` into words and maps each to a local SignAsset.
 * Words with no matching local file get an empty URI so the player
 * shows its built-in fallback card.
 */
export const resolveLocalSigns = (glossText: string): SignAsset[] => {
  const words = glossText
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.map((word, index) => {
    const asset = lookupWord(word);

    return {
      id: `local-${index}-${word}`,
      label: word.toUpperCase(),
      uri: asset?.uri ?? "",
      type: asset?.type ?? "image",
    };
  });
};
