import { NextRequest } from "next/server";
import { applyToBountyInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { badRequest, created, notFound, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { sanitizeText } from "@/lib/sanitize";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }
    if (auth.viaApiKey) {
      return unauthorized("Human applications require account login.");
    }
    if (!auth.user.humanProfile) {
      return unauthorized("Complete human profile before applying.");
    }

    const bounty = await db.bounty.findUnique({
      where: { id: context.params.id }
    });
    if (!bounty) {
      return notFound("Bounty not found.");
    }
    if (bounty.status !== "OPEN") {
      return badRequest("Bounty is not open for applications.");
    }
    if (bounty.agentUserId === auth.user.id) {
      return badRequest("Cannot apply to your own bounty.");
    }

    const payload = await request.json();
    const parsed = applyToBountyInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid application payload.", {
        issues: parsed.error.issues
      });
    }

    const existing = await db.application.findUnique({
      where: {
        bountyId_humanUserId: {
          bountyId: context.params.id,
          humanUserId: auth.user.id
        }
      }
    });
    if (existing && existing.status !== "WITHDRAWN") {
      return badRequest("You already applied to this bounty.");
    }

    const application = existing
      ? await db.application.update({
          where: { id: existing.id },
          data: {
            message: sanitizeText(parsed.data.message),
            proposedTerms: sanitizeText(parsed.data.proposedTerms),
            status: "PENDING"
          }
        })
      : await db.application.create({
          data: {
            bountyId: context.params.id,
            humanUserId: auth.user.id,
            message: sanitizeText(parsed.data.message),
            proposedTerms: sanitizeText(parsed.data.proposedTerms),
            status: "PENDING"
          }
        });

    return created({ application });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
