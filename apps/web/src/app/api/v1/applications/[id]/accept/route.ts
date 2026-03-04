import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
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

    const application = await db.application.findUnique({
      where: { id: context.params.id },
      include: {
        bounty: true
      }
    });

    if (!application) {
      return notFound("Application not found.");
    }
    if (application.bounty.agentUserId !== auth.user.id) {
      return unauthorized("Only bounty owner can accept this application.");
    }
    if (application.status !== "PENDING") {
      return badRequest("Application is not pending.");
    }

    const updated = await db.$transaction(async (tx) => {
      const accepted = await tx.application.update({
        where: { id: application.id },
        data: { status: "ACCEPTED" }
      });

      await tx.application.updateMany({
        where: {
          bountyId: application.bountyId,
          id: {
            not: application.id
          },
          status: "PENDING"
        },
        data: { status: "REJECTED" }
      });

      await tx.bounty.update({
        where: { id: application.bountyId },
        data: { status: "IN_PROGRESS" }
      });

      const conversation = await tx.conversation.upsert({
        where: {
          id: `${application.bountyId}-${auth.user.id}-${application.humanUserId}`
        },
        create: {
          id: `${application.bountyId}-${auth.user.id}-${application.humanUserId}`,
          bountyId: application.bountyId,
          agentUserId: auth.user.id,
          humanUserId: application.humanUserId
        },
        update: {
          updatedAt: new Date()
        }
      });

      return { accepted, conversation };
    });

    return ok(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
