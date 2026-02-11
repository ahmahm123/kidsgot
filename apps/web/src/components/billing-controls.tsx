"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BillingControls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redirectTo(path: "/api/stripe/checkout" | "/api/stripe/portal") {
    setLoading(true);
    setError(null);
    const response = await fetch(path, { method: "POST" });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Billing action failed");
      return;
    }
    window.location.href = payload.url;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={loading} onClick={() => redirectTo("/api/stripe/checkout")}>
        Subscribe $9.99/mo
      </Button>
      <Button disabled={loading} variant="secondary" onClick={() => redirectTo("/api/stripe/portal")}>
        Open Stripe portal
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
