// One-Line Laugh-Off — v2 entry (rewrite).
//
// What this program does, in three small stages:
//   1. assemble the single joke line from its three spoken beats,
//   2. check the assembled line against the competition gate,
//   3. drop it into $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing
//      newline, then echo it to stdout for the human reader.
//
// Nothing here touches the network, reads the clock, or depends on
// anything outside Node 22's standard library, so every run produces
// the same bytes.

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Stage 1 — the line itself.
// ---------------------------------------------------------------------------
//
// The joke is stored as three beats rather than one long literal, so the
// shape of the sentence stays visible in the source. Joining them with a
// single space each reproduces the entry exactly:
//
//   "My bank called to ask if I was okay — I checked my balance and said, 'fair question.'"
const BEATS: readonly string[] = [
  "My bank called to ask if I was okay",
  "—",
  "I checked my balance and said, 'fair question.'",
];

function assembleLine(beats: readonly string[]): string {
  return beats.join(" ");
}

// ---------------------------------------------------------------------------
// Stage 2 — the gate.
// ---------------------------------------------------------------------------
//
// Competition gate (from competition.yaml): the entry must be a single
// line of 1–200 characters. Instead of one compound boolean, each rule is
// its own small check and every failure is collected before we give up,
// so a bad line reports everything wrong with it at once.

interface GateFailure {
  rule: string;
  detail: string;
}

const GATE = { minChars: 1, maxChars: 200 } as const;

function checkGate(line: string): GateFailure[] {
  const failures: GateFailure[] = [];

  // Count code points, not UTF-16 units, so the em dash counts as one.
  const charCount = [...line].length;
  if (charCount < GATE.minChars) {
    failures.push({ rule: "min-length", detail: `only ${charCount} characters` });
  }
  if (charCount > GATE.maxChars) {
    failures.push({ rule: "max-length", detail: `${charCount} characters exceeds ${GATE.maxChars}` });
  }

  // Single line means no line-break characters anywhere in the text.
  for (const ch of line) {
    if (ch === "\n" || ch === "\r") {
      failures.push({ rule: "single-line", detail: "entry contains a line break" });
      break;
    }
  }

  // A line of nothing but spaces is not a joke.
  if (line.trim().length === 0) {
    failures.push({ rule: "non-blank", detail: "entry is blank or whitespace only" });
  }

  // No accidental padding around the joke.
  if (line !== line.trim()) {
    failures.push({ rule: "no-padding", detail: "entry has leading or trailing whitespace" });
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Stage 3 — output.
// ---------------------------------------------------------------------------

function verifyWrittenEntry(entryPath: string, expected: string): void {
  // Re-read the file as raw bytes and compare against the expected bytes.
  // Comparing Buffers (not decoded strings) catches any encoding drift,
  // a stray trailing newline, or a partial write.
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = fs.readFileSync(entryPath);
  if (!actualBytes.equals(expectedBytes)) {
    throw new Error(
      `entry.txt mismatch: wrote ${actualBytes.length} bytes, expected ${expectedBytes.length} bytes`,
    );
  }
  if (actualBytes.length > 0 && actualBytes[actualBytes.length - 1] === 0x0a) {
    throw new Error("entry.txt must not end with a trailing newline");
  }
}

function resolveEntryPath(): string {
  const dir = process.env.MAKEFUN_OUTPUT_DIR;
  if (dir === undefined || dir.length === 0) {
    throw new Error("MAKEFUN_OUTPUT_DIR is not set");
  }
  return path.join(dir, "entry.txt");
}

function main(): void {
  const line = assembleLine(BEATS);

  const failures = checkGate(line);
  if (failures.length > 0) {
    const summary = failures.map((f) => `${f.rule}: ${f.detail}`).join("; ");
    throw new Error(`entry fails the competition gate — ${summary}`);
  }

  const entryPath = resolveEntryPath();
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, Buffer.from(line, "utf8"));
  verifyWrittenEntry(entryPath, line);

  // The human-facing echo. Stdout gets a trailing newline; entry.txt
  // deliberately does not.
  process.stdout.write(line + "\n");
}

main();
