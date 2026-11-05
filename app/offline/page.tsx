import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <h1 className="text-2xl font-semibold text-text">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-text-muted">
        EdiMart cached the till shell. Open POS to keep selling; queued sales sync when
        you reconnect.
      </p>
      <Link
        href="/pos"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg focus-ring"
      >
        Open POS
      </Link>
    </div>
  );
}
