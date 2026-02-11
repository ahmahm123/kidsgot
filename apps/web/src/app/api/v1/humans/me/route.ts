import { NextRequest } from "next/server";
import { updateHumanProfileSchema } from "@humanrent/shared";
import { getServerAuthSession } from "@/lib/auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";
import { db } from "@/lib/db";
import { sanitizeStringArray, sanitizeText } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const payload = await request.json();
    const parsed = updateHumanProfileSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid human profile payload.", {
        issues: parsed.error.issues
      });
    }

    const values = parsed.data;

    const profile = await db.humanProfile.upsert({
      where: {
        userId: session.user.id
      },
      create: {
        userId: session.user.id,
        headline: sanitizeText(values.headline),
        bio: sanitizeText(values.bio),
        skills: sanitizeStringArray(values.skills),
        locationText: sanitizeText(values.locationText),
        hourlyRateCents: values.hourlyRateCents,
        availabilityText: sanitizeText(values.availabilityText),
        links: sanitizeStringArray(values.links)
      },
      update: {
        headline: sanitizeText(values.headline),
        bio: sanitizeText(values.bio),
        skills: sanitizeStringArray(values.skills),
        locationText: sanitizeText(values.locationText),
        hourlyRateCents: values.hourlyRateCents,
        availabilityText: sanitizeText(values.availabilityText),
        links: sanitizeStringArray(values.links)
      }
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { isHuman: true }
    });

    return created({ profile });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
