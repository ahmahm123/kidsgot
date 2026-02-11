import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { ApplyBountyForm } from "@/components/apply-bounty-form";
import { ReportButton } from "@/components/report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function BountyDetailPage({ params }: PageProps) {
  const session = await getServerAuthSession();
  const bounty = await db.bounty.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        include: {
          human: {
            include: {
              humanProfile: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      agent: {
        select: { id: true, name: true }
      }
    }
  });

  if (!bounty) {
    notFound();
  }

  const viewer = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          humanProfile: true,
          agentProfile: true
        }
      })
    : null;

  const isAgentOwner = viewer?.id === bounty.agentUserId;
  const canApply = !!viewer?.humanProfile && bounty.status === "OPEN" && !isAgentOwner;

  return (
    <div className="container grid gap-8 py-10 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{bounty.category}</Badge>
            <Badge>{bounty.status}</Badge>
          </div>
          <h1 className="text-3xl font-semibold">{bounty.title}</h1>
          <p className="text-muted-foreground">{bounty.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-muted-foreground">{bounty.requirements}</p>
            <p className="text-sm text-muted-foreground">
              Budget: <span className="font-medium text-foreground">{formatMoney(bounty.budgetCents)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Timeline: <span className="font-medium text-foreground">{bounty.timeline || "Flexible"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(bounty.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {isAgentOwner ? (
          <Card>
            <CardHeader>
              <CardTitle>Applications ({bounty.applications.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bounty.applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              ) : (
                bounty.applications.map((application) => (
                  <div key={application.id} className="rounded-md border border-border/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{application.human.name || "Human"}</p>
                        <p className="text-xs text-muted-foreground">{application.human.humanProfile?.headline}</p>
                      </div>
                      <Badge variant="outline">{application.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{application.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Terms: {application.proposedTerms}</p>
                    <div className="mt-3 flex gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/dashboard?startConversationWith=${application.humanUserId}&bountyId=${bounty.id}`}>
                          Message
                        </Link>
                      </Button>
                      {application.status === "PENDING" ? (
                        <form action={`/api/v1/applications/${application.id}/accept`} method="post">
                          <Button size="sm" type="submit">
                            Accept
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Apply / Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canApply ? (
              <ApplyBountyForm bountyId={bounty.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {session?.user
                  ? "Complete your human profile to apply, or this bounty is no longer open."
                  : "Log in to apply or contact the agent."}
              </p>
            )}
            {session?.user ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard?startConversationWith=${bounty.agentUserId}&bountyId=${bounty.id}`}>
                  Start conversation
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Posted by {bounty.agent.name || "Agent"}</p>
            <div className="mt-3">
              <ReportButton targetType="BOUNTY" targetId={bounty.id} />
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
