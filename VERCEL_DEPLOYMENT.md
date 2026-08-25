# HIVECORE — Vercel Deployment Checklist

## 1. Vercel project

Create a dedicated Vercel project connected to:

`adrian-jaimes2430/hivecore-accelerate-2b80de89`

Recommended project name:

`hivecore`

Use the repository root as the project root.

Build command:

`npm run build`

No custom output directory is required for the TanStack Start + Nitro deployment.

## 2. Environment variables

Configure these in Vercel for **Production** and **Preview** as appropriate:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- `VITE_META_PIXEL_ID`
- `META_PIXEL_ID`

Use the real values from the existing Supabase/Meta configuration. Never commit the service-role key to GitHub.

## 3. First deployment

Deploy branch:

`migration/vercel-production`

Do not merge to `main` until the preview passes QA.

## 4. Mandatory QA

- `/`
- `/login`
- authentication persistence after refresh
- logout
- approved/pending/blocked account states
- `/app`
- `/admin`
- product funnel routes
- category routes
- order creation
- checkout/order confirmation
- Supabase reads/writes
- server functions
- integrations/webhooks
- Meta Pixel events
- image/storage access
- mobile responsive behavior

## 5. Production

After preview QA:

1. Merge the migration PR into `main`.
2. Let Vercel deploy `main` to Production.
3. Add the custom domain `hivecore.ayoecosystem.com` to the Vercel project.
4. At the DNS provider, create the CNAME requested by Vercel for the `hivecore` subdomain.
5. Verify the domain and TLS certificate.

The current Lovable project should remain untouched until the Vercel deployment is confirmed stable.
