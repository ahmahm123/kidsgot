import { NextRequest } from "next/server";
import { sendMessageInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { badRequest, created, notFound, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { checkAndConsumeRateLimit } from "@/lib/rate-limit";
import { getPusherServer } from "@/lib/pusher";
import { sanitizeText } from "@/lib/sanitize";

type RouteContext = {
  params: {
    id: string;
  };
};

async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId }
  });
  if (!conversation) {
    return null;
  }
  if (conversation.agentUserId !== userId && conversation.humanUserId !== userId) {
    return "forbidden";
  }
  return conversation;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }

    const conversation = await getConversationForUser(context.params.id, auth.user.id);
    if (!conversation) {
      return notFound("Conversation not found.");
    }
    if (conversation === "forbidden") {
      return unauthorized("Not part of this conversation.");
    }

    const messages = await db.message.findMany({
      where: {
        conversationId: context.params.id
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 200
    });

    return ok({ messages });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }

    const conversation = await getConversationForUser(context.params.id, auth.user.id);
    if (!conversation) {
      return notFound("Conversation not found.");
    }
    if (conversation === "forbidden") {
      return unauthorized("Not part of this conversation.");
    }

    if (auth.user.isAgent) {
      const rateResult = await checkAndConsumeRateLimit(auth.user.id, "messages");
      if (!rateResult.allowed) {
        return tooManyRequests("Message rate limit exceeded.", rateResult.resetAt);
      }
    }

    const payload = await request.json();
    const parsed = sendMessageInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid message payload.", {
        issues: parsed.error.issues
      });
    }

    const message = await db.message.create({
      data: {
        conversationId: context.params.id,
        senderUserId: auth.user.id,
        body: sanitizeText(parsed.data.text)
      }
    });

    await db.conversation.update({
      where: { id: context.params.id },
      data: { updatedAt: new Date() }
    });

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(`conversation-${context.params.id}`, "message:new", message);
    }

    return created({ message });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
