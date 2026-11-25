export type CleanOptions = {
  unwrapLines: boolean;
  rejoinHyphens: boolean;
  collapseSpaces: boolean;
  removeDuplicateLines: boolean;
  stripFormatting: boolean;
};

export const defaultOptions: CleanOptions = {
  unwrapLines: true,
  rejoinHyphens: true,
  collapseSpaces: true,
  removeDuplicateLines: true,
  stripFormatting: true,
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
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (options.stripFormatting) text = stripFormatting(text);
  if (options.rejoinHyphens) text = rejoinHyphens(text);
  if (options.collapseSpaces) text = collapseSpaces(text);
  if (options.unwrapLines) text = unwrapLines(text);
  if (options.collapseSpaces) text = collapseSpaces(text);
  if (options.removeDuplicateLines) text = removeDuplicateLines(text);

  return text.replace(/\n{3,}/g, "\n\n").trim();
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

function rejoinHyphens(text: string): string {
  return text.replace(/([A-Za-z])-[ \t]*\n[ \t]*([a-z])/g, "$1$2");
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

function removeDuplicateLines(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let previous = "";

  for (const line of lines) {
    const key = line.trim();
    if (!key) {
      kept.push("");
      continue;
    }
    if (key === previous) continue;
    kept.push(line.trim());
    previous = key;
  }

  return kept.join("\n");
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
