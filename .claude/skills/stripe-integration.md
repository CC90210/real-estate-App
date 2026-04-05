---
description: "Manage Stripe integration for PropFlow — subscriptions, rent collection via Connect, webhooks."
---
# Stripe for PropFlow

## Subscription Flow
- Landlord signs up → Stripe Checkout session → webhook creates subscription record in Supabase

## Rent Collection (Connect)
- Tenants pay rent → Stripe Connect → landlord's connected account
- Platform fee applied automatically

## Webhooks
- Route: `src/app/api/webhooks/stripe/route.ts`
- MUST verify webhook signature before processing
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`

## Testing
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```