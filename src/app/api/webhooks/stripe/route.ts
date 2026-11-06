import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, recordStripeInvoice, syncStripeSubscription } from "@/lib/billing";

/**
 * Stripe → our database. Every request is verified with STRIPE_WEBHOOK_SECRET before anything is read.
 * Subscribe this endpoint to: checkout.session.completed, invoice.paid,
 * customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          await syncStripeSubscription(stripe, session.subscription);
        }
        break;
      }
      case "invoice.paid":
        await recordStripeInvoice(stripe, event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(stripe, event.data.object.id);
        break;
    }
  } catch (e) {
    // A 500 makes Stripe retry the event later.
    console.error("stripe webhook failed", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
