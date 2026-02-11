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
    const bounty = await db.bounty.findUnique({
      where: {
        id: context.params.id
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        applications: {
          include: {
            human: {
              select: {
                id: true,
                name: true,
                image: true,
                humanProfile: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!bounty) {
      return notFound("Bounty not found.");
    }

    return ok({ bounty });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
