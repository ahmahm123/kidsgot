import { NextRequest } from "next/server";
import { startConversationInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { badRequest, created, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { checkAndConsumeRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }

    const conversations = await db.conversation.findMany({
      where: auth.viaApiKey
        ? {
            agentUserId: auth.user.id
          }
        : {
            OR: [{ agentUserId: auth.user.id }, { humanUserId: auth.user.id }]
          },
      include: {
        bounty: true,
        agent: { select: { id: true, name: true, image: true } },
        human: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    return ok({ conversations });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }
    if (!auth.user.isAgent || auth.user.agentProfile?.subscriptionStatus !== "ACTIVE") {
      return unauthorized("Active subscribed agent required.");
    }

    const rateResult = await checkAndConsumeRateLimit(auth.user.id, "conversations");
    if (!rateResult.allowed) {
      return tooManyRequests("Conversation rate limit exceeded.", rateResult.resetAt);
    }

    const payload = await request.json();
    const parsed = startConversationInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid conversation payload.", {
        issues: parsed.error.issues
      });
    }

    const targetHuman = await db.user.findUnique({
      where: {
        id: parsed.data.humanId
      },
      include: {
        humanProfile: true
      }
    });
    if (!targetHuman?.humanProfile) {
      return badRequest("Target human profile not found.");
    }

    if (parsed.data.bountyId) {
      const bounty = await db.bounty.findUnique({
        where: { id: parsed.data.bountyId }
      });
      if (!bounty || bounty.agentUserId !== auth.user.id) {
        return badRequest("Invalid bounty for this conversation.");
      }
    }

    const conversationId = parsed.data.bountyId
      ? `${parsed.data.bountyId}-${auth.user.id}-${parsed.data.humanId}`
      : `direct-${auth.user.id}-${parsed.data.humanId}`;

    const conversation = await db.conversation.upsert({
      where: { id: conversationId },
      create: {
        id: conversationId,
        bountyId: parsed.data.bountyId || null,
        agentUserId: auth.user.id,
        humanUserId: parsed.data.humanId
      },
      update: {
        updatedAt: new Date()
      }
    });

    return created({ conversation });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
