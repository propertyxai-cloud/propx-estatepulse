# Supabase source-of-truth notes

This repository contains the current PropertyX frontend, selected Edge Function source, and the incremental database migrations applied to the connected Supabase project during the November 2026 hardening work.

## Project
- Supabase project ref: `gsotueowzyajkugxslpz`
- Region: `ap-southeast-1`
- Edge Functions in source control: `ai-search`, `ai-assistant`, `admin-users`, `lemonsqueezy-checkout`, `lemonsqueezy-webhook`
- Never commit service-role keys, model provider keys, payment credentials, or webhook signing secrets.

## Important migration history note
The connected database contains earlier migrations and direct database changes which predate this repository's current baseline. These files contain exact incremental changes applied in November 2026; they do not reconstruct every historic migration shown in the remote project's migration list. Do not reset the remote database or run a fresh production migration push from a blank database until the historic migration baseline has been reconciled and verified against a staging branch.

## Local development
1. Copy `.env.example` to `.env.local`.
2. Set only the public project URL and publishable/anon key in `VITE_*` variables.
3. Install with `npm ci`.
4. Run `npm test` and `npm run build`.
5. Configure provider credentials as Edge Function secrets in Supabase; do not put server secrets in `.env.local` or browser code.

## Edge Function configuration
`config.toml` records the JWT verification mode observed in the connected project. The webhook and payment endpoints verify provider signatures / authenticate their caller in function code as applicable. Keep webhook signatures and the service-role key secret.

## Data integrity
- Inquiry identities and lead recipients are assigned by database triggers, not by client payloads.
- Guest inquiries are accepted only for approved, active listings; owner IDs and inquiry contact fields cannot be rewritten by a seller.
- Public listing inquiry endpoints are rate-limited in a database trigger.
- Public marketplace results include only approved, non-archived listings.
- Market price snapshots are derived from actual asking prices and are not completed-sale records.
- Broker reviews remain pending until an administrator approves them.
- Seller-submitted listings remain pending until moderation.
- Do not seed fabricated property listings, transaction history, ratings, reviews, or market-price history.
