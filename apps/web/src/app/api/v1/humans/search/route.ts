import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { searchHumansInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { badRequest, ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = searchHumansInputSchema.safeParse(query);

    if (!parsed.success) {
      return badRequest("Invalid search query.", {
        issues: parsed.error.issues
      });
    }

    const { q, location, minRate, maxRate, availability, limit, cursor, sort } = parsed.data;
    const take = Math.min(limit, MAX_LIMIT);

    // Postgres full-text + trigram path (feature flag fallback is Prisma filtering below).
    if (q && !cursor && sort === "relevance") {
      const rows = await db.$queryRaw<{ userId: string }[]>(Prisma.sql`
        SELECT hp."userId"
        FROM "HumanProfile" hp
        WHERE (
          to_tsvector('english', coalesce(hp."headline",'') || ' ' || coalesce(hp."bio",'') || ' ' || coalesce(array_to_string(hp."skills",' '), ''))
            @@ plainto_tsquery('english', ${q})
          OR similarity(coalesce(hp."headline",'') || ' ' || coalesce(hp."bio",'') || ' ' || coalesce(array_to_string(hp."skills",' '), ''), ${q}) > 0.08
        )
        ${location ? Prisma.sql`AND hp."locationText" ILIKE ${`%${location}%`}` : Prisma.empty}
        ${availability ? Prisma.sql`AND hp."availabilityText" ILIKE ${`%${availability}%`}` : Prisma.empty}
        ${minRate ? Prisma.sql`AND hp."hourlyRateCents" >= ${minRate * 100}` : Prisma.empty}
        ${maxRate ? Prisma.sql`AND hp."hourlyRateCents" <= ${maxRate * 100}` : Prisma.empty}
        ORDER BY
          ts_rank(
            to_tsvector('english', coalesce(hp."headline",'') || ' ' || coalesce(hp."bio",'') || ' ' || coalesce(array_to_string(hp."skills",' '), '')),
            plainto_tsquery('english', ${q})
          ) DESC,
          similarity(coalesce(hp."headline",'') || ' ' || coalesce(hp."bio",'') || ' ' || coalesce(array_to_string(hp."skills",' '), ''), ${q}) DESC,
          hp."createdAt" DESC
        LIMIT ${take + 1}
      `);

      const userIds = rows.map((row) => row.userId);
      const hasMore = userIds.length > take;
      const slicedIds = hasMore ? userIds.slice(0, take) : userIds;
      const profiles = await db.humanProfile.findMany({
        where: {
          userId: { in: slicedIds }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });
      const profileById = new Map(profiles.map((item) => [item.userId, item]));
      const ordered = slicedIds.map((id) => profileById.get(id)).filter(Boolean);
      return ok({
        items: ordered,
        nextCursor: hasMore ? slicedIds[slicedIds.length - 1] : null
      });
    }

    const where = {
      AND: [
        q
          ? {
              OR: [
                { headline: { contains: q, mode: "insensitive" as const } },
                { bio: { contains: q, mode: "insensitive" as const } },
                { skills: { hasSome: q.split(" ").filter(Boolean) } }
              ]
            }
          : {},
        location
          ? {
              locationText: { contains: location, mode: "insensitive" as const }
            }
          : {},
        minRate ? { hourlyRateCents: { gte: minRate * 100 } } : {},
        maxRate ? { hourlyRateCents: { lte: maxRate * 100 } } : {},
        availability
          ? {
              availabilityText: { contains: availability, mode: "insensitive" as const }
            }
          : {}
      ]
    };

    const orderBy =
      sort === "rate_asc"
        ? [{ hourlyRateCents: "asc" as const }, { createdAt: "desc" as const }]
        : sort === "rate_desc"
          ? [{ hourlyRateCents: "desc" as const }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const profiles = await db.humanProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy,
      take: take + 1,
      ...(cursor
        ? {
            cursor: { userId: cursor },
            skip: 1
          }
        : {})
    });

    const hasMore = profiles.length > take;
    const items = hasMore ? profiles.slice(0, take) : profiles;
    const nextCursor = hasMore ? items[items.length - 1]?.userId : null;

    return ok({
      items,
      nextCursor
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
