import Link from "next/link";
import { Bounty } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

type BountyCardProps = {
  bounty: Bounty & { _count?: { applications: number } };
};

function statusVariant(status: Bounty["status"]): "default" | "secondary" | "success" | "outline" {
  switch (status) {
    case "OPEN":
      return "success";
    case "IN_PROGRESS":
      return "default";
    case "COMPLETED":
      return "secondary";
    default:
      return "outline";
  }
}

export function BountyCard({ bounty }: BountyCardProps) {
  return (
    <Card className="h-full border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="line-clamp-2 text-xl">{bounty.title}</CardTitle>
          <Badge variant={statusVariant(bounty.status)}>{bounty.status.replace("_", " ")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{bounty.category}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">{bounty.description}</p>
        <div className="text-sm text-muted-foreground">
          Budget: <span className="font-medium text-foreground">{formatMoney(bounty.budgetCents)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {bounty._count?.applications ?? 0} application(s)
        </span>
        <Button asChild size="sm">
          <Link href={`/bounties/${bounty.id}`}>View</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
