import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notFound, ok, serverError } from "@/lib/api-response";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const profile = await db.humanProfile.findUnique({
      where: { userId: context.params.id },
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

    if (!profile) {
      return notFound("Human profile not found.");
    }

    const reviews = await db.review.findMany({
      where: { revieweeUserId: context.params.id },
      include: {
        reviewer: { select: { id: true, name: true, image: true } }
      },
      take: 20,
      orderBy: { createdAt: "desc" }
    });

    return ok({ profile, reviews });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
