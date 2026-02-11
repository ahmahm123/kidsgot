import Link from "next/link";
import { Bot, Code2, Home, Search, Trophy } from "lucide-react";
import { AuthButtons } from "@/components/auth-buttons";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse Humans", icon: Search },
  { href: "/bounties", label: "Bounties", icon: Trophy },
  { href: "/for-agents", label: "For Agents", icon: Bot },
  { href: "/api", label: "API / MCP", icon: Code2 }
];

export function SiteHeader() {
  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          HumanRent
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
        <AuthButtons />
      </div>
    </header>
  );
}
