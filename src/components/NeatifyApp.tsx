"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  SAMPLE_TEXT,
  clean,
  defaultOptions,
  describeChanges,
  measure,
  presets,
  type CleanOptions,
  type PresetId,
} from "@/lib/neatify";

const OPTIONS: { key: keyof CleanOptions; label: string }[] = [
  { key: "unwrapLines", label: "Fix line breaks" },
  { key: "rejoinHyphens", label: "Rejoin split words" },
  { key: "collapseSpaces", label: "Remove extra spaces" },
  { key: "removeDuplicateLines", label: "Remove duplicate lines" },
  { key: "stripFormatting", label: "Strip leftover formatting" },
];

const fieldClass =
  "min-h-72 w-full flex-1 resize-y bg-transparent px-4 py-3 font-mono text-sm leading-6 text-text placeholder:text-text-subtle";

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const presetIds = Object.keys(presets) as PresetId[];

function sameOptions(left: CleanOptions, right: CleanOptions) {
  return (Object.keys(left) as (keyof CleanOptions)[]).every((key) => left[key] === right[key]);
}

export function NeatifyApp() {
  const [source, setSource] = useState("");
  const [options, setOptions] = useState<CleanOptions>(defaultOptions);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "light");

  const result = useMemo(() => clean(source, options), [source, options]);
  const cleaned = result.text;
  const changeSummary = source.trim() ? describeChanges(result.changes) : "";
  const before = useMemo(() => measure(source), [source]);
  const after = useMemo(() => measure(cleaned), [cleaned]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void copyText(cleaned);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cleaned]);

  async function copyText(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setSource(text);
      setNotice(null);
    } catch {
      setNotice("Allow clipboard access to paste, or paste into the box.");
    }
  }

  function downloadText() {
    if (!cleaned) return;
    const file = new Blob([cleaned], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neatify.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("neatify-theme", next);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="page-wrap flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-none text-text">Neatify</p>
            <p className="mt-1 text-sm text-text-muted">Fix text instantly</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-muted"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="page-wrap flex flex-1 flex-col gap-5 py-6 sm:py-8">
        <p className="max-w-2xl text-base text-text-muted">
          Paste text copied from a PDF, a website, or Word. Extra spaces, broken lines, duplicate
          lines, and leftover formatting come out as clean paragraphs.
        </p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
          {presetIds.map((id) => {
            const preset = presets[id];
            const selected = sameOptions(options, preset.options);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setOptions(preset.options)}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm",
                  selected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border bg-surface text-text hover:bg-surface-muted",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Cleaning options</legend>
          {OPTIONS.map((option) => (
            <label
              key={option.key}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm text-text",
                options[option.key]
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={options[option.key]}
                onChange={() =>
                  setOptions((current) => ({ ...current, [option.key]: !current[option.key] }))
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Pasted text</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => void pasteClipboard()}>
                  Paste
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSource(SAMPLE_TEXT)}>
                  Sample
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSource("")} disabled={!source}>
                  Clear
                </Button>
              </div>
            </div>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Paste messy text here"
              aria-label="Pasted text"
              className={fieldClass}
              spellCheck={false}
            />
            <MeasureBar measure={before} note={notice} />
          </section>

          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Clean text</h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={downloadText} disabled={!cleaned}>
                  Download
                </Button>
                <Button size="sm" onClick={() => void copyText(cleaned)} disabled={!cleaned}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <textarea
              readOnly
              value={cleaned}
              placeholder="Clean text shows up here"
              aria-label="Clean text"
              className={fieldClass}
              spellCheck={false}
            />
            <MeasureBar measure={after} note={changeSummary} />
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="page-wrap py-4 text-sm text-text-subtle">
          Cleaning runs in the browser. The text stays on this device. Cmd or Ctrl + Enter copies the clean text.
        </div>
      </footer>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M4.9 4.9l1.3 1.3M17.8 17.8l1.3 1.3M3 12h1.8M19.2 12H21M4.9 19.1l1.3-1.3M17.8 6.2l1.3-1.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function MeasureBar({
  measure: stats,
  note,
}: {
  measure: { characters: number; words: number; lines: number };
  note?: string | null;
}) {
  return (
    <div className="border-t border-border px-4 py-2 text-sm text-text-subtle">
      <p>
        {`${stats.characters} ${stats.characters === 1 ? "character" : "characters"}, ${stats.words} ${stats.words === 1 ? "word" : "words"}, ${stats.lines} ${stats.lines === 1 ? "line" : "lines"}`}
      </p>
      {note ? <p className="mt-1 text-text-muted">{note}</p> : null}
    </div>
  );
}
