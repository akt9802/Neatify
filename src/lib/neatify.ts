export type CleanOptions = {
  unwrapLines: boolean;
  rejoinHyphens: boolean;
  collapseSpaces: boolean;
  removeDuplicateLines: boolean;
  stripFormatting: boolean;
  singleBlock: boolean;
};

export const defaultOptions: CleanOptions = {
  unwrapLines: true,
  rejoinHyphens: true,
  collapseSpaces: true,
  removeDuplicateLines: true,
  stripFormatting: true,
  singleBlock: false,
};

export const presets = {
  pdf: {
    label: "PDF",
    options: { ...defaultOptions },
  },
  email: {
    label: "Email",
    options: {
      unwrapLines: false,
      rejoinHyphens: false,
      collapseSpaces: true,
      removeDuplicateLines: true,
      stripFormatting: true,
      singleBlock: false,
    } satisfies CleanOptions,
  },
  chat: {
    label: "Chat",
    options: {
      unwrapLines: true,
      rejoinHyphens: true,
      collapseSpaces: true,
      removeDuplicateLines: true,
      stripFormatting: true,
      singleBlock: true,
    } satisfies CleanOptions,
  },
} as const;

export type PresetId = keyof typeof presets;

export type CleanChange = {
  lineBreaksJoined: number;
  duplicateLinesRemoved: number;
  extraSpacesRemoved: number;
};

export type TextMeasure = {
  characters: number;
  words: number;
  lines: number;
};

const PAGE_NUMBER =
  /^(?:page\s+\d{1,4}|\d{1,4}|\d{1,4}\s*(?:\/|of)\s*\d{1,4}|[-–—]\s*\d{1,4}\s*[-–—])$/i;

const LIST_LINE = /^(?:[-*+]|\d+[.)]|[a-zA-Z][.)])\s+\S/;

export function measure(text: string): TextMeasure {
  if (!text) return { characters: 0, words: 0, lines: 0 };
  const trimmed = text.trim();
  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: text.split("\n").length,
  };
}

export function neatify(input: string, options: CleanOptions = defaultOptions): string {
  return clean(input, options).text;
}

export function clean(input: string, options: CleanOptions = defaultOptions): { text: string; changes: CleanChange } {
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const changes: CleanChange = {
    lineBreaksJoined: 0,
    duplicateLinesRemoved: 0,
    extraSpacesRemoved: 0,
  };

  if (options.stripFormatting) text = stripFormatting(text);
  if (options.rejoinHyphens) {
    const rejoined = rejoinHyphens(text);
    changes.lineBreaksJoined += rejoined.joined;
    text = rejoined.text;
  }
  if (options.collapseSpaces) text = applyCollapse(text, changes);
  if (options.unwrapLines) {
    const before = text ? text.split("\n").length : 0;
    text = unwrapLines(text);
    const after = text ? text.split("\n").length : 0;
    changes.lineBreaksJoined += Math.max(0, before - after);
  }
  if (options.collapseSpaces) text = applyCollapse(text, changes);
  if (options.removeDuplicateLines) {
    const deduped = removeDuplicateLines(text);
    changes.duplicateLinesRemoved += deduped.removed;
    text = deduped.text;
  }
  if (options.singleBlock) {
    changes.lineBreaksJoined += text.match(/\n/g)?.length ?? 0;
    text = applyCollapse(text.replace(/\n+/g, " "), changes);
  }

  text = text.replace(/\n{3,}/g, "\n\n");
  const trimmed = text.trim();
  if (options.collapseSpaces) changes.extraSpacesRemoved += text.length - trimmed.length;
  return { text: trimmed, changes };
}

export function describeChanges(changes: CleanChange): string {
  const parts: string[] = [];
  if (changes.lineBreaksJoined) {
    parts.push(
      `${changes.lineBreaksJoined} line ${changes.lineBreaksJoined === 1 ? "break" : "breaks"} joined`,
    );
  }
  if (changes.duplicateLinesRemoved) {
    parts.push(
      `${changes.duplicateLinesRemoved} duplicate ${changes.duplicateLinesRemoved === 1 ? "line" : "lines"} removed`,
    );
  }
  if (changes.extraSpacesRemoved) {
    parts.push(
      `${changes.extraSpacesRemoved} extra ${changes.extraSpacesRemoved === 1 ? "space" : "spaces"} removed`,
    );
  }
  if (!parts.length) return "";
  return `${parts.join(", ")}.`;
}

function stripFormatting(text: string): string {
  let next = decodeEntities(text);
  next = next
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/?[a-zA-Z][^>\n]*>/g, "");

  next = next.normalize("NFKC");
  next = next.replace(/[\u200B-\u200D\uFEFF\u2060\u180E\u00AD]/g, "");
  next = next.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  next = next
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-");
  next = next.replace(/^([ \t]*)(?:[\u2022\u2023\u2043\u204C\u204D\u2219\u25AA\u25CF\u25E6\uF0B7\uF0A7]|·)\s*/gm, "$1- ");
  next = next.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  return next
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (PAGE_NUMBER.test(trimmed)) return false;
      if (/^[*\-_=~.]{3,}$/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

function decodeEntities(text: string): string {
  const named = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

  return named
    .replace(/&#(\d+);/g, (full, digits: string) => fromCodePoint(Number(digits), full))
    .replace(/&#x([0-9a-f]+);/gi, (full, hex: string) => fromCodePoint(parseInt(hex, 16), full));
}

function fromCodePoint(code: number, fallback: string): string {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return fallback;
  return String.fromCodePoint(code);
}

function rejoinHyphens(text: string): { text: string; joined: number } {
  const matches = text.match(/([A-Za-z])-[ \t]*\n[ \t]*([a-z])/g);
  return {
    text: text.replace(/([A-Za-z])-[ \t]*\n[ \t]*([a-z])/g, "$1$2"),
    joined: matches?.length ?? 0,
  };
}

function applyCollapse(text: string, changes: CleanChange): string {
  const next = collapseSpaces(text);
  changes.extraSpacesRemoved += Math.max(0, text.length - next.length);
  return next;
}

function collapseSpaces(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

function unwrapLines(text: string): string {
  const lines = text.split("\n");
  const widths = lines
    .map((line) => line.trim().length)
    .filter((length) => length >= 40)
    .sort((a, b) => a - b);

  if (widths.length < 2) return text;

  const wrapWidth = widths[Math.floor(widths.length * 0.8)] ?? widths[widths.length - 1];
  if (wrapWidth < 40) return text;

  const blocks: string[] = [];
  let block: string[] = [];
  let buffer = "";

  const flushBuffer = () => {
    if (buffer) block.push(buffer);
    buffer = "";
  };

  const flushBlock = () => {
    flushBuffer();
    if (block.length) blocks.push(block.join("\n"));
    block = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    if (!buffer) {
      buffer = trimmed;
      continue;
    }

    if (shouldJoin(buffer, trimmed, wrapWidth)) {
      buffer = `${buffer} ${trimmed}`;
    } else {
      flushBuffer();
      buffer = trimmed;
    }
  }

  flushBlock();
  return blocks.join("\n\n");
}

function shouldJoin(current: string, next: string, wrapWidth: number): boolean {
  if (isListLine(next) || looksLikeHeading(current) || looksLikeHeading(next)) return false;

  const endsSentence = /[.!?…]["')\]]*$/.test(current);
  if (!endsSentence && /^[a-z("]/.test(next)) return true;

  const nearWrap = current.length >= Math.max(48, wrapWidth * 0.62);
  if (!nearWrap) return false;
  if (endsSentence && current.length < wrapWidth * 0.88) return false;
  return true;
}

function isListLine(line: string): boolean {
  return LIST_LINE.test(line.trim());
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 72 || isListLine(trimmed)) return false;
  if (/[.!?,:;]$/.test(trimmed)) return false;

  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;

  const words = trimmed.split(/\s+/);
  return words.length <= 8 && trimmed.length <= 48 && /^[A-Z0-9]/.test(trimmed) && !/[a-z]$/.test(trimmed);
}

function removeDuplicateLines(text: string): { text: string; removed: number } {
  const lines = text.split("\n");
  const kept: string[] = [];
  let previous = "";
  let removed = 0;

  for (const line of lines) {
    const key = line.trim();
    if (!key) {
      kept.push("");
      continue;
    }
    if (key === previous) {
      removed += 1;
      continue;
    }
    kept.push(line.trim());
    previous = key;
  }

  return { text: kept.join("\n"), removed };
}

export const SAMPLE_TEXT = `CHAPTER 1

This  is   a   para-
graph copied from a PDF. It has hard
line breaks in the mid-
dle of sentences and extra     spaces.

This  is   a   para-
graph copied from a PDF. It has hard
line breaks in the mid-
dle of sentences and extra     spaces.

2

•  First point that wraps onto
the next line of the column

“Smart quotes” and an em—dash, plus a ligature: ﬁle.

&nbsp;Hello&nbsp;&amp; welcome<br>from a website.

Jane Doe
12 Park Street
London
`;
