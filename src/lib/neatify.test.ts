import assert from "node:assert/strict";
import test from "node:test";
import { clean, defaultOptions, describeChanges, neatify, presets, SAMPLE_TEXT, type CleanOptions } from "./neatify.ts";

function withOptions(patch: Partial<CleanOptions>): CleanOptions {
  return { ...defaultOptions, ...patch };
}

test("rejoins hyphenated words and unwraps a wrapped paragraph", () => {
  const input = [
    "This  is   a   para-",
    "graph copied from a PDF. It has hard",
    "line breaks in the mid-",
    "dle of sentences and extra     spaces.",
  ].join("\n");

  assert.equal(
    neatify(input),
    "This is a paragraph copied from a PDF. It has hard line breaks in the middle of sentences and extra spaces.",
  );
});

test("drops a duplicated paragraph and isolated page numbers", () => {
  const output = neatify(SAMPLE_TEXT);
  const copies = output.split("This is a paragraph copied from a PDF.").length - 1;
  assert.equal(copies, 1);
  assert.equal(output.includes("\n2\n"), false);
  assert.match(output, /^CHAPTER 1\n\nThis is a paragraph/);
});

test("keeps short lines such as an address on their own lines", () => {
  const output = neatify(SAMPLE_TEXT);
  assert.match(output, /Jane Doe\n12 Park Street\nLondon/);
});

test("joins a wrapped list item and normalizes the bullet", () => {
  const output = neatify(SAMPLE_TEXT);
  assert.match(output, /- First point that wraps onto the next line of the column/);
});

test("strips quotes, dashes, ligatures, and simple html", () => {
  const output = neatify(SAMPLE_TEXT);
  assert.match(output, /"Smart quotes" and an em - dash, plus a ligature: file\./);
  assert.match(output, /Hello & welcome from a website\./);
});

test("leaves internal spacing alone when every clean step is off", () => {
  const input = "Hello   world\r\nnext";
  assert.equal(
    neatify(
      input,
      withOptions({
        unwrapLines: false,
        rejoinHyphens: false,
        collapseSpaces: false,
        removeDuplicateLines: false,
        stripFormatting: false,
      }),
    ),
    "Hello   world\nnext",
  );
});

test("returns an empty string for blank input", () => {
  assert.equal(neatify("   \n\n  "), "");
});

test("email preset keeps line breaks and chat preset makes one block", () => {
  const input = "Hello   there\n\nSecond line";
  assert.equal(neatify(input, presets.email.options), "Hello there\n\nSecond line");
  assert.equal(neatify(input, presets.chat.options), "Hello there Second line");
});

test("describes the spaces, breaks, and duplicate lines it removed", () => {
  const input = "Hello    world\nHello    world";
  const { changes } = clean(input, presets.pdf.options);
  assert.equal(describeChanges(changes), "1 duplicate line removed, 6 extra spaces removed.");
});
