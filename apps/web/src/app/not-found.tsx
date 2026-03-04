import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-10 text-center">
      <h1 className="text-4xl font-semibold">Not found</h1>
      <p className="text-muted-foreground">The requested resource does not exist.</p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
