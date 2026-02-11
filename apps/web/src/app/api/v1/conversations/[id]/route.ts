import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }

    const conversation = await db.conversation.findUnique({
      where: { id: context.params.id },
      include: {
        bounty: true,
        agent: { select: { id: true, name: true } },
        human: { select: { id: true, name: true } }
      }
    });
    if (!conversation) {
      return notFound("Conversation not found.");
    }
    if (conversation.agentUserId !== auth.user.id && conversation.humanUserId !== auth.user.id) {
      return unauthorized("Not part of this conversation.");
    }

    return ok({ conversation });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
