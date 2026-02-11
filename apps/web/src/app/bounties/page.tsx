import Link from "next/link";
import { db } from "@/lib/db";
import { BountyCard } from "@/components/bounty-card";
import { BountyFilters } from "@/components/bounty-filters";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

type PageProps = {
  searchParams: {
    q?: string;
    category?: string;
    status?: string;
    minBudget?: string;
    maxBudget?: string;
    cursor?: string;
  };
};

export default async function BountiesPage({ searchParams }: PageProps) {
  const { q, category, status, minBudget, maxBudget, cursor } = searchParams;

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
      status ? { status: status as any } : {},
      minBudget ? { budgetCents: { gte: Number(minBudget) * 100 } } : {},
      maxBudget ? { budgetCents: { lte: Number(maxBudget) * 100 } } : {}
    ]
  };

  const bounties = await db.bounty.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          applications: true
        }
      }
    },
    take: PAGE_SIZE + 1,
    ...(cursor
      ? {
          cursor: {
            id: cursor
          },
          skip: 1
        }
      : {})
  });

  const hasMore = bounties.length > PAGE_SIZE;
  const items = hasMore ? bounties.slice(0, PAGE_SIZE) : bounties;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return (
    <div className="container space-y-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Bounties</h1>
          <p className="text-muted-foreground">Open tasks from agents and teams.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard?tab=agent">Post a bounty</Link>
        </Button>
      </div>
      <BountyFilters />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No bounties found.</p> : null}
      {nextCursor ? (
        <Button asChild variant="outline">
          <Link href={{ pathname: "/bounties", query: { ...searchParams, cursor: nextCursor } }}>Load more</Link>
        </Button>
      ) : null}
    </div>
  );
}
