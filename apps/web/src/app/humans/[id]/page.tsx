import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportButton } from "@/components/report-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function HumanProfilePage({ params }: PageProps) {
  const profile = await db.humanProfile.findUnique({
    where: {
      userId: params.id
    },
    include: {
      user: true
    }
  });

  if (!profile) {
    notFound();
  }

  const reviews = await db.review.findMany({
    where: {
      revieweeUserId: params.id
    },
    include: {
      reviewer: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });

  return (
    <div className="container space-y-8 py-10">
      <section className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">{profile.user.name || "Human Pro"}</h1>
            <p className="text-lg text-muted-foreground">{profile.headline}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{profile.locationText}</Badge>
              <Badge variant="secondary">{profile.availabilityText}</Badge>
              <Badge>{formatMoney(profile.hourlyRateCents)}/hour</Badge>
              {profile.verifiedAt ? <Badge variant="success">Verified</Badge> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Button asChild>
              <a href="/for-agents">Book via API / MCP</a>
            </Button>
            <ReportButton targetType="USER" targetId={profile.userId} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge variant="secondary" key={skill}>
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.links.length ? (
              profile.links.map((link) => (
                <a key={link} href={link} className="block truncate text-sm text-primary hover:underline">
                  {link}
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No links provided.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="grid gap-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{review.reviewer.name || "Agent"}</span>
                    <span>{"★".repeat(review.rating)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
