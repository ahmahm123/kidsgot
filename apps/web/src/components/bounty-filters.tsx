"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";
import { BOUNTY_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function BountyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const formData = new FormData(event.currentTarget);

    ["q", "category", "status", "minBudget", "maxBudget"].forEach((key) => {
      const value = String(formData.get(key) || "").trim();
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 md:grid-cols-6">
      <Input name="q" placeholder="Title or keyword" defaultValue={searchParams.get("q") || ""} className="md:col-span-2" />
      <Select name="category" defaultValue={searchParams.get("category") || ""}>
        <option value="">All categories</option>
        {BOUNTY_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={searchParams.get("status") || ""}>
        <option value="">All statuses</option>
        <option value="OPEN">OPEN</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="COMPLETED">COMPLETED</option>
      </Select>
      <Input name="minBudget" placeholder="Min budget" defaultValue={searchParams.get("minBudget") || ""} />
      <Input name="maxBudget" placeholder="Max budget" defaultValue={searchParams.get("maxBudget") || ""} />
      <Button className="md:col-span-6" type="submit">
        Apply Filters
      </Button>
    </form>
  );
}
