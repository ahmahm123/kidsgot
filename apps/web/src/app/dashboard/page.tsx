import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUsageSnapshot } from "@/lib/rate-limit";
import { formatMoney } from "@/lib/utils";
import { ApiKeyManager } from "@/components/api-key-manager";
import { BillingControls } from "@/components/billing-controls";
import { HumanProfileForm } from "@/components/human-profile-form";
import { PostBountyForm } from "@/components/post-bounty-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: {
    tab?: string;
    startConversationWith?: string;
    bountyId?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tab = searchParams.tab === "human" ? "human" : "agent";

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      humanProfile: true,
      agentProfile: true
    }
  });

  if (!user) {
    redirect("/login");
  }

  if (searchParams.startConversationWith && user.agentProfile?.subscriptionStatus === "ACTIVE") {
    const targetHuman = await db.user.findUnique({
      where: {
        id: searchParams.startConversationWith
      },
      include: {
        humanProfile: true
      }
    });
    if (targetHuman?.humanProfile) {
      const conversationId = searchParams.bountyId
        ? `${searchParams.bountyId}-${user.id}-${targetHuman.id}`
        : `direct-${user.id}-${targetHuman.id}`;
      await db.conversation.upsert({
        where: {
          id: conversationId
        },
        create: {
          id: conversationId,
          agentUserId: user.id,
          humanUserId: targetHuman.id,
          bountyId: searchParams.bountyId || null
        },
        update: {}
      });
      redirect(`/dashboard/conversations/${conversationId}`);
    }
  }

  const [applications, bounties, conversations, usage] = await Promise.all([
    db.application.findMany({
      where: {
        humanUserId: user.id
      },
      include: {
        bounty: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    db.bounty.findMany({
      where: {
        agentUserId: user.id
      },
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    db.conversation.findMany({
      where: {
        OR: [{ agentUserId: user.id }, { humanUserId: user.id }]
      },
      include: {
        bounty: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        agent: {
          select: { name: true }
        },
        human: {
          select: { name: true }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 10
    }),
    getUsageSnapshot(user.id)
  ]);

  const earningsEstimate = applications
    .filter((item) => item.status === "ACCEPTED")
    .reduce((sum, item) => sum + item.bounty.budgetCents, 0);

  return (
    <div className="container space-y-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Manage profiles, bounties, conversations, and API access.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard?tab=agent" className={`rounded-md px-3 py-2 text-sm ${tab === "agent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Agent
          </Link>
          <Link href="/dashboard?tab=human" className={`rounded-md px-3 py-2 text-sm ${tab === "human" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Human
          </Link>
        </div>
      </div>

      {tab === "human" ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Human profile</CardTitle>
            </CardHeader>
            <CardContent>
              <HumanProfileForm
                initialValues={{
                  headline: user.humanProfile?.headline || "",
                  bio: user.humanProfile?.bio || "",
                  skillsText: user.humanProfile?.skills.join(", ") || "",
                  linksText: user.humanProfile?.links.join(", ") || "",
                  locationText: user.humanProfile?.locationText || "",
                  hourlyRateCents: user.humanProfile?.hourlyRateCents || 2500,
                  availabilityText: user.humanProfile?.availabilityText || ""
                }}
              />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications yet.</p>
                ) : (
                  applications.map((application) => (
                    <div key={application.id} className="rounded-md border border-border/60 p-3">
                      <p className="font-medium">{application.bounty.title}</p>
                      <p className="text-xs text-muted-foreground">{application.status}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Earnings (estimate)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{formatMoney(earningsEstimate)}</p>
                <p className="text-xs text-muted-foreground">Based on accepted bounty budgets.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription and API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  <Badge variant={user.agentProfile?.subscriptionStatus === "ACTIVE" ? "success" : "outline"}>
                    {user.agentProfile?.subscriptionStatus || "INACTIVE"}
                  </Badge>
                </p>
                <BillingControls />
                <ApiKeyManager />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Post bounty</CardTitle>
              </CardHeader>
              <CardContent>
                <PostBountyForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your bounties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bounties.map((bounty) => (
                  <div key={bounty.id} className="flex items-center justify-between rounded-md border border-border/60 p-3">
                    <div>
                      <p className="font-medium">{bounty.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {bounty.status} · {bounty._count.applications} applications
                      </p>
                    </div>
                    <Link href={`/bounties/${bounty.id}`} className="text-sm text-primary underline">
                      Open
                    </Link>
                  </div>
                ))}
                {bounties.length === 0 ? <p className="text-sm text-muted-foreground">No bounties yet.</p> : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  conversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/dashboard/conversations/${conversation.id}`}
                      className="block rounded-md border border-border/60 p-3"
                    >
                      <p className="font-medium">
                        {user.id === conversation.agentUserId
                          ? conversation.human.name || "Human"
                          : conversation.agent.name || "Agent"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.messages[0]?.body || "No messages yet"}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rate limit usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {usage.map((entry) => (
                  <div key={entry.type}>
                    <p className="font-medium capitalize">{entry.type}</p>
                    <p className="text-muted-foreground">
                      {entry.used}/{entry.limit} used · resets {entry.resetAt.toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
