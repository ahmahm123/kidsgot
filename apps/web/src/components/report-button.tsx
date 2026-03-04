"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportButtonProps = {
  targetType: "USER" | "BOUNTY" | "MESSAGE" | "REVIEW";
  targetId: string;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    const reason = window.prompt("Describe the issue");
    if (!reason) return;
    setError(null);
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        reason
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not submit report.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={submitReport} disabled={done}>
        <Flag className="mr-2 h-3.5 w-3.5" />
        {done ? "Reported" : "Report"}
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
