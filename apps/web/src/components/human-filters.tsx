"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function HumanFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    ["q", "location", "availability", "minRate", "maxRate", "sort"].forEach((key) => {
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
    <form onSubmit={updateFilters} className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 md:grid-cols-6">
      <Input name="q" placeholder="Skills, headline..." defaultValue={searchParams.get("q") || ""} className="md:col-span-2" />
      <Input name="location" placeholder="Location" defaultValue={searchParams.get("location") || ""} />
      <Input name="minRate" placeholder="Min $/hour" defaultValue={searchParams.get("minRate") || ""} />
      <Input name="maxRate" placeholder="Max $/hour" defaultValue={searchParams.get("maxRate") || ""} />
      <Select name="availability" defaultValue={searchParams.get("availability") || ""}>
        <option value="">Any availability</option>
        <option value="full-time">Full-time</option>
        <option value="part-time">Part-time</option>
        <option value="weekends">Weekends</option>
        <option value="on-demand">On-demand</option>
      </Select>
      <div className="md:col-span-5">
        <Select name="sort" defaultValue={searchParams.get("sort") || "relevance"}>
          <option value="relevance">Sort: relevance</option>
          <option value="rate_asc">Rate: low to high</option>
          <option value="rate_desc">Rate: high to low</option>
          <option value="newest">Newest</option>
        </Select>
      </div>
      <Button className="md:col-span-1" type="submit">
        Filter
      </Button>
    </form>
  );
}
