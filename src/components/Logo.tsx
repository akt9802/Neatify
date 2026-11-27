export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path className="fill-background" d="M8.5 23.5V8.5h3.3l8.4 9.8V8.5h3.3v15h-3.3l-8.4-9.8v9.8H8.5z" />
    </svg>
  );
}
