import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export const AGENT_PLAN_NAME = "Agent API Access";
export const AGENT_PLAN_PRICE = 999;
