"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  headline: z.string().min(5),
  bio: z.string().min(20),
  skillsText: z.string().min(2),
  linksText: z.string().optional(),
  locationText: z.string().min(2),
  hourlyRateCents: z.coerce.number().int().min(500),
  availabilityText: z.string().min(2)
});

type FormValues = z.infer<typeof formSchema>;

export function HumanProfileForm({ initialValues }: { initialValues?: Partial<FormValues> }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: initialValues?.headline || "",
      bio: initialValues?.bio || "",
      skillsText: initialValues?.skillsText || "",
      locationText: initialValues?.locationText || "",
      hourlyRateCents: initialValues?.hourlyRateCents || 2500,
      availabilityText: initialValues?.availabilityText || "",
      linksText: initialValues?.linksText || ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/v1/humans/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: values.headline,
        bio: values.bio,
        skills: values.skillsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        locationText: values.locationText,
        hourlyRateCents: values.hourlyRateCents,
        availabilityText: values.availabilityText,
        links: (values.linksText || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to save profile.");
      return;
    }
    setSuccess("Profile saved.");
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" {...register("headline")} />
        {errors.headline ? <p className="text-sm text-red-400">{errors.headline.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" {...register("bio")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="skills">Skills (comma-separated)</Label>
          <Input id="skills" {...register("skillsText")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="links">Links (comma-separated URLs)</Label>
          <Input id="links" {...register("linksText")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="locationText">Location</Label>
          <Input id="locationText" {...register("locationText")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourlyRateCents">Hourly rate (cents)</Label>
          <Input id="hourlyRateCents" type="number" {...register("hourlyRateCents", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availabilityText">Availability</Label>
          <Input id="availabilityText" {...register("availabilityText")} />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save profile"}
      </Button>
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
