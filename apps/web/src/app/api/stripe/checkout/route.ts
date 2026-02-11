import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.email) {
      return unauthorized();
    }
    if (!env.STRIPE_PRICE_ID) {
      return badRequest("Missing STRIPE_PRICE_ID.");
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { agentProfile: true }
    });
    if (!user) {
      return unauthorized();
    }

    const stripe = getStripe();
    let customerId = user.agentProfile?.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;
      await db.agentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          plan: "AGENT_API_ACCESS",
          subscriptionStatus: "INACTIVE"
        },
        update: {
          stripeCustomerId: customerId
        }
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?tab=agent&checkout=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?tab=agent&checkout=cancelled`,
      metadata: {
        userId: user.id
      }
    });

    return ok({ url: checkout.url });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
