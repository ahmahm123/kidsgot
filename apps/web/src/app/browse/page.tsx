import Link from "next/link";
import { db } from "@/lib/db";
import { HumanCard } from "@/components/human-card";
import { HumanFilters } from "@/components/human-filters";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type PageProps = {
  searchParams: {
    q?: string;
    location?: string;
    minRate?: string;
    maxRate?: string;
    availability?: string;
    cursor?: string;
    sort?: string;
  };
};

export default async function BrowseHumansPage({ searchParams }: PageProps) {
  const {
    q,
    location,
    minRate,
    maxRate,
    availability,
    cursor,
    sort = "relevance"
  } = searchParams;

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
      availability
        ? {
            availabilityText: { contains: availability, mode: "insensitive" as const }
          }
        : {},
      minRate ? { hourlyRateCents: { gte: Number(minRate) * 100 } } : {},
      maxRate ? { hourlyRateCents: { lte: Number(maxRate) * 100 } } : {}
    ]
  };

  const orderBy =
    sort === "rate_asc"
      ? [{ hourlyRateCents: "asc" as const }]
      : sort === "rate_desc"
        ? [{ hourlyRateCents: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const profiles = await db.humanProfile.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          image: true
        }
      }
    },
    orderBy,
    take: PAGE_SIZE + 1,
    ...(cursor
      ? {
          cursor: { userId: cursor },
          skip: 1
        }
      : {})
  });

  const hasMore = profiles.length > PAGE_SIZE;
  const items = hasMore ? profiles.slice(0, PAGE_SIZE) : profiles;
  const nextCursor = hasMore ? items[items.length - 1]?.userId : null;

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Browse Humans</h1>
        <p className="text-muted-foreground">
          Search by skills, location, rate, and availability. Built for agentic hiring workflows.
        </p>
      </div>
      <HumanFilters />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((profile) => (
          <HumanCard key={profile.id} profile={profile} />
        ))}
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No humans found.</p> : null}
      {nextCursor ? (
        <Button asChild variant="outline">
          <Link
            href={{
              pathname: "/browse",
              query: {
                ...searchParams,
                cursor: nextCursor
              }
            }}
          >
            Load more
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
