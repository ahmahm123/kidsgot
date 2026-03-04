import { z } from "zod";

export const availabilityEnum = z.enum(["FULL_TIME", "PART_TIME", "WEEKENDS", "ON_DEMAND"]);
export type Availability = z.infer<typeof availabilityEnum>;

export const bountyStatusEnum = z.enum([
  "OPEN",
  "APPLIED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED"
]);
export type BountyStatus = z.infer<typeof bountyStatusEnum>;

export const applicationStatusEnum = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN"
]);
export type ApplicationStatus = z.infer<typeof applicationStatusEnum>;

export const searchHumansInputSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  minRate: z.coerce.number().int().min(0).optional(),
  maxRate: z.coerce.number().int().min(0).optional(),
  availability: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  sort: z.enum(["relevance", "rate_asc", "rate_desc", "newest"]).default("relevance")
});

export const createBountyInputSchema = z.object({
  title: z.string().min(8).max(120),
  description: z.string().min(30),
  requirements: z.string().min(10),
  budgetCents: z.coerce.number().int().positive(),
  category: z.string().min(2).max(64),
  timeline: z.string().min(2).max(120).optional()
});

export const applyToBountyInputSchema = z.object({
  message: z.string().min(20),
  proposedTerms: z.string().min(3)
});

export const startConversationInputSchema = z.object({
  humanId: z.string().cuid(),
  bountyId: z.string().cuid().optional()
});

export const sendMessageInputSchema = z.object({
  text: z.string().min(1).max(4000)
});

export const reportInputSchema = z.object({
  targetType: z.enum(["USER", "BOUNTY", "MESSAGE", "REVIEW"]),
  targetId: z.string().min(1),
  reason: z.string().min(10).max(1000)
});

export const createApiKeyInputSchema = z.object({
  label: z.string().min(2).max(64).default("Default key")
});

export const updateHumanProfileSchema = z.object({
  headline: z.string().min(5).max(120),
  bio: z.string().min(20),
  skills: z.array(z.string().min(1).max(32)).min(1).max(20),
  locationText: z.string().min(2).max(120),
  hourlyRateCents: z.coerce.number().int().min(500),
  availabilityText: z.string().min(2).max(120),
  links: z.array(z.string().url()).max(8).default([])
});
