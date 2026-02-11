import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";

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
    if (!auth.user.isAgent || auth.user.agentProfile?.subscriptionStatus !== "ACTIVE") {
      return unauthorized("Active subscribed agent required.");
    }

    const bounty = await db.bounty.findUnique({
      where: { id: context.params.id }
    });
    if (!bounty) {
      return badRequest("Bounty not found.");
    }
    if (bounty.agentUserId !== auth.user.id) {
      return unauthorized("Only bounty owner can complete.");
    }
    if (bounty.status !== "IN_PROGRESS") {
      return badRequest("Bounty must be IN_PROGRESS before completion.");
    }

    const updated = await db.bounty.update({
      where: { id: context.params.id },
      data: { status: "COMPLETED" }
    });
    return ok({ bounty: updated });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
