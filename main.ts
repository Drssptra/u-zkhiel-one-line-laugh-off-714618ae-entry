// A single funny line, printed to stdout and written to
// $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing newline.
// Node 22, standard library only, no network, deterministic.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The entry: one line, well under the 200-character gate.
const ENTRY =
  "I named my Roomba 'Debt' — it follows me everywhere, never leaves, and somehow keeps growing.";

// Guard the gate: one line, 1 to 200 characters, never only whitespace.
if (ENTRY.length < 1 || ENTRY.length > 200 || /\n/.test(ENTRY) || ENTRY.trim().length === 0) {
  throw new Error(`entry violates the gate: ${ENTRY.length} characters`);
}

// Where the sealed scorer looks for the entry.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const entryPath = join(outputDir, "entry.txt");

mkdirSync(outputDir, { recursive: true });
writeFileSync(entryPath, ENTRY, "utf8");

console.log(ENTRY);
