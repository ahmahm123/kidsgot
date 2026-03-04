import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { sanitizeText } from "@/lib/sanitize";

const reviewSchema = z.object({
  bountyId: z.string().cuid(),
  revieweeUserId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(1000)
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }
    if (!auth.user.isAgent || auth.user.agentProfile?.subscriptionStatus !== "ACTIVE") {
      return unauthorized("Active subscribed agent required.");
    }

    const payload = await request.json();
    const parsed = reviewSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid review payload.", { issues: parsed.error.issues });
    }

    const bounty = await db.bounty.findUnique({
      where: { id: parsed.data.bountyId }
    });
    if (!bounty || bounty.agentUserId !== auth.user.id) {
      return unauthorized("Only bounty owner can review.");
    }

    const review = await db.review.create({
      data: {
        bountyId: parsed.data.bountyId,
        reviewerUserId: auth.user.id,
        revieweeUserId: parsed.data.revieweeUserId,
        rating: parsed.data.rating,
        text: sanitizeText(parsed.data.text)
      }
    });

    return created({ review });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
