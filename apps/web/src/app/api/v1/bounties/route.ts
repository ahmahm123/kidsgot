import { NextRequest } from "next/server";
import { BountyStatus } from "@prisma/client";
import { createBountyInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { checkAndConsumeRateLimit } from "@/lib/rate-limit";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { badRequest, created, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { sanitizeText } from "@/lib/sanitize";

const PAGE_SIZE_DEFAULT = 20;

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    const q = query.get("q")?.trim() || "";
    const category = query.get("category")?.trim() || undefined;
    const statusRaw = query.get("status")?.trim() || undefined;
    const status = statusRaw && Object.values(BountyStatus).includes(statusRaw as BountyStatus)
      ? (statusRaw as BountyStatus)
      : undefined;
    const cursor = query.get("cursor")?.trim() || undefined;
    const limit = Math.min(Number(query.get("limit") || PAGE_SIZE_DEFAULT), 50);
    const minBudget = Number(query.get("minBudget") || 0);
    const maxBudgetRaw = query.get("maxBudget");
    const maxBudget = maxBudgetRaw ? Number(maxBudgetRaw) : undefined;

    const where = {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { requirements: { contains: q, mode: "insensitive" as const } }
              ]
            }
          : {},
        category ? { category } : {},
        status ? { status } : {},
        minBudget ? { budgetCents: { gte: minBudget * 100 } } : {},
        maxBudget ? { budgetCents: { lte: maxBudget * 100 } } : {}
      ]
    };

    const bounties = await db.bounty.findMany({
      where,
      include: {
        _count: { select: { applications: true } }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {})
    });

    const hasMore = bounties.length > limit;
    const items = hasMore ? bounties.slice(0, limit) : bounties;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return ok({ items, nextCursor });
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

    const rateResult = await checkAndConsumeRateLimit(auth.user.id, "bounties");
    if (!rateResult.allowed) {
      return tooManyRequests("Bounty creation rate limit exceeded.", rateResult.resetAt);
    }

    const payload = await request.json();
    const parsed = createBountyInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid bounty payload.", {
        issues: parsed.error.issues
      });
    }

    const bounty = await db.bounty.create({
      data: {
        agentUserId: auth.user.id,
        title: sanitizeText(parsed.data.title),
        description: sanitizeText(parsed.data.description),
        requirements: sanitizeText(parsed.data.requirements),
        budgetCents: parsed.data.budgetCents,
        category: sanitizeText(parsed.data.category),
        timeline: parsed.data.timeline ? sanitizeText(parsed.data.timeline) : null
      }
    });

    return created({ bounty });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
