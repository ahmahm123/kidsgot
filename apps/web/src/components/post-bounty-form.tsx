"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBountyInputSchema } from "@humanrent/shared";
import { z } from "zod";
import { BOUNTY_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  title: z.string().min(8),
  description: z.string().min(30),
  requirements: z.string().min(10),
  budgetCents: z.number().int().positive(),
  category: z.string().min(2),
  timeline: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function PostBountyForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: BOUNTY_CATEGORIES[0]
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const validated = createBountyInputSchema.safeParse(values);
    if (!validated.success) {
      setError("Please correct invalid bounty inputs.");
      return;
    }
    const response = await fetch("/api/v1/bounties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(validated.data)
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to create bounty");
      return;
    }
    router.push(`/bounties/${payload.bounty.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} />
        {errors.title ? <p className="text-sm text-red-400">{errors.title.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea id="requirements" {...register("requirements")} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="budgetCents">Budget (USD)</Label>
          <Input id="budgetCents" type="number" {...register("budgetCents", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" {...register("category")}>
            {BOUNTY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline">Timeline</Label>
          <Input id="timeline" {...register("timeline")} placeholder="2 days" />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Posting..." : "Post bounty"}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
