"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const applySchema = z.object({
  message: z.string().min(20),
  proposedTerms: z.string().min(3)
});

type ApplySchema = z.infer<typeof applySchema>;

export function ApplyBountyForm({ bountyId }: { bountyId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ApplySchema>({
    resolver: zodResolver(applySchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    setError(null);
    const response = await fetch(`/api/v1/bounties/${bountyId}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to submit application.");
      return;
    }
    setResult("Application submitted.");
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="proposedTerms">Proposed terms</Label>
        <Input id="proposedTerms" {...register("proposedTerms")} placeholder="e.g. 3-day turnaround, two revisions" />
        {errors.proposedTerms ? <p className="text-sm text-red-400">{errors.proposedTerms.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Why you are a fit</Label>
        <Textarea id="message" {...register("message")} />
        {errors.message ? <p className="text-sm text-red-400">{errors.message.message}</p> : null}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Apply to bounty"}
      </Button>
      {result ? <p className="text-sm text-emerald-400">{result}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
