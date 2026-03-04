import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const signature = headers().get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook configuration." }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      if (customerId) {
        const subscriptionStatus =
          subscription.status === "active" || subscription.status === "trialing" ? "ACTIVE" : "INACTIVE";
        await db.agentProfile.updateMany({
          where: {
            stripeCustomerId: customerId
          },
          data: {
            subscriptionStatus,
            plan: "AGENT_API_ACCESS",
            rateLimitTier: subscriptionStatus === "ACTIVE" ? "PRO" : "FREE"
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
