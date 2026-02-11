import Link from "next/link";
import { HumanProfile, User } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

type HumanCardProps = {
  profile: HumanProfile & { user: Pick<User, "name" | "image"> };
};

export function HumanCard({ profile }: HumanCardProps) {
  return (
    <Card className="h-full border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={profile.user.image || undefined} />
            <AvatarFallback>{(profile.user.name || "H").slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{profile.user.name || "Human Pro"}</CardTitle>
            <p className="truncate text-sm text-muted-foreground">{profile.locationText}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{profile.headline}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {profile.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{formatMoney(profile.hourlyRateCents)}</span>/hour ·{" "}
          {profile.availabilityText}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        {profile.verifiedAt ? <Badge variant="success">Verified</Badge> : <Badge variant="outline">Unverified</Badge>}
        <Button asChild size="sm">
          <Link href={`/humans/${profile.userId}`}>View profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
