"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  SAMPLE_TEXT,
  defaultOptions,
  measure,
  neatify,
  type CleanOptions,
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

export function NeatifyApp() {
  const [source, setSource] = useState("");
  const [options, setOptions] = useState<CleanOptions>(defaultOptions);
  const [copied, setCopied] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "light");

  const cleaned = useMemo(() => neatify(source, options), [source, options]);
  const before = useMemo(() => measure(source), [source]);
  const after = useMemo(() => measure(cleaned), [cleaned]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("neatify-theme", next);
  }

  async function copyCleaned() {
    if (!cleaned) return;
    await navigator.clipboard.writeText(cleaned);
    setCopied(true);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="page-wrap flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-none text-text">Neatify</p>
            <p className="mt-1 text-sm text-text-muted">Fix text instantly</p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleTheme} aria-pressed={theme === "dark"}>
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </header>

      <main className="page-wrap flex flex-1 flex-col gap-5 py-6 sm:py-8">
        <p className="max-w-2xl text-base text-text-muted">
          Paste text copied from a PDF, a website, or Word. Extra spaces, broken lines, duplicate
          lines, and leftover formatting come out as clean paragraphs.
        </p>

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
            <MeasureBar measure={before} />
          </section>

          <section className="flex min-h-0 flex-col rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Clean text</h2>
              <Button size="sm" onClick={copyCleaned} disabled={!cleaned}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <textarea
              readOnly
              value={cleaned}
              placeholder="Clean text shows up here"
              aria-label="Clean text"
              className={fieldClass}
              spellCheck={false}
            />
            <MeasureBar measure={after} />
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="page-wrap py-4 text-sm text-text-subtle">
          Cleaning runs in the browser. The text stays on this device.
        </div>
      </footer>
    </div>
  );
}

function MeasureBar({ measure: stats }: { measure: { characters: number; words: number; lines: number } }) {
  return (
    <p className="border-t border-border px-4 py-2 text-sm text-text-subtle">
      {stats.characters} characters, {stats.words} words, {stats.lines} lines
    </p>
  );
}
