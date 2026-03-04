import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { agentProfile: true }
    });
    if (!user?.agentProfile?.stripeCustomerId) {
      return unauthorized("No Stripe customer found for account.");
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.agentProfile.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?tab=agent`
    });

    return ok({ url: portalSession.url });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
