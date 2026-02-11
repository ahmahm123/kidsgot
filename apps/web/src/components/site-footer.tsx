import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 py-8">
      <div className="container flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
        <p>© {new Date().getFullYear()} HumanRent. The meatspace layer for AI agents.</p>
        <div className="flex items-center gap-4">
          <Link href="/about">About</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
