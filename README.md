# Forkly

**Your restaurant. Under control.**

Forkly is a multi-tenant restaurant management SaaS: orders and a kitchen display, finances, inventory, menu & recipe costing, team roles, and a dashboard each restaurant can personalize with its own logo, colours and layout.

Built with Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Realtime, Row Level Security) · Recharts · React Hook Form + Zod · dnd-kit.

---

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in your Supabase URL + publishable key
npx supabase link --project-ref <your-project-ref>
npx supabase db push              # applies supabase/migrations
npm run dev                       # http://localhost:3000
```

Then open the app, create an account and either set up your restaurant (10-step onboarding) or click **Create demo restaurant** to explore six weeks of sample data.

### Local Supabase (optional)

```bash
npx supabase start                # needs Docker
npx supabase db reset             # applies migrations
```
Use the printed API URL and publishable key in `.env.local`.

## Configuring Supabase

1. **Create a project** at supabase.com.
2. **Apply the migrations** in `supabase/migrations` (`npx supabase db push`, or paste them in order into the SQL editor). They create:
   - all tables, enums and the order/inventory/finance logic
   - Row Level Security on every table
   - storage buckets `branding` (public), `menu-photos` (public), `receipts` (private) with per-restaurant policies
   - the `orders` table in the `supabase_realtime` publication (kitchen display)
3. **Auth → URL configuration**: set *Site URL* to your app URL and add `https://your-app/auth/callback` to *Redirect URLs*.
4. **Auth → Providers → Email**: keep email/password enabled. With *Confirm email* on, new users confirm via the link (handled by `/auth/callback`); with it off they go straight to onboarding.
5. Copy the project URL and publishable (anon) key into `.env.local`.

No service-role key is needed: everything runs as the signed-in user, so RLS is always enforced.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable/anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also accepted) |
| `NEXT_PUBLIC_SITE_URL` | yes in production | Base URL for invitation links |

Integration and AI keys are listed in `.env.example` for later phases; none are read yet.

## Architecture

```
src/
  proxy.ts                    session refresh + route protection (Next 16 "proxy")
  app/
    (auth)/login, signup      email/password auth
    onboarding/               10-step setup wizard (skippable, with progress)
    invite/[token]/           accept a team invitation
    (app)/                    the workspace shell (sidebar, branding, permissions)
      dashboard/              customizable widget dashboard
      orders/, orders/kitchen order queue + touch kitchen display (realtime)
      finances/               revenue, expenses, recurring, receipts, CSV export
      inventory/              stock, movements ledger, alerts
      menu/, menu/[id]        menu + recipe builder with live food-cost
      integrations/           marketplace with honest connection status
      settings/               profile, branding, region, roles, users, …
  lib/
    workspace.ts              loads the active restaurant + permission map
    supabase/                 server & browser clients
    dashboard/                widget registry, presets, data loader
    integrations/             provider abstraction (connector interface + registry)
    receipts/extractor.ts     interface for future receipt OCR (not implemented)
supabase/
  migrations/                 schema, RLS, business logic, storage, demo seed
  tests/rls_test.sql          52-check tenant-isolation & logic test suite
```

### Multi-tenancy & security

- Every restaurant-owned row has `restaurant_id`; **RLS** policies call `public.can(restaurant_id, section, 'view'|'edit')`.
- Owners always have full access; every other role (manager, employee, accountant, kitchen) gets a per-section **view/edit matrix** the owner edits in *Settings → Roles & permissions*.
- Triggers reject references to another tenant's rows and forbid changing `restaurant_id`.
- Integration tokens live in `integration_credentials`, which has RLS enabled and **no** user policies (service-side only).
- Server actions validate all input with Zod; prices are always taken from the menu inside `create_order`, never from the client.

### Business logic in the database

- **Order completed** → revenue record created + recipe ingredients deducted (with g↔kg and ml↔l conversion). **Cancelled after completion** → both reversed.
- **Inventory** is an append-only movement ledger (purchase, usage, waste, count adjustment, order deduction, PO receipt); the stock level is derived from it.
- **Purchase order received** → stock added and the expense recorded (RPC ready; UI arrives with Suppliers).
- **Recurring expenses** are materialized idempotently when Finances is opened.

### Testing

```bash
# Runs migrations against a throwaway database on any Postgres 15+ and
# executes the isolation/business-logic suite.
PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/db-test.sh
```

## Status

| Area | Status |
| --- | --- |
| Auth, multi-tenant workspaces, roles & permission matrix, invitations | ✅ working |
| Onboarding (10 steps), branding with live preview, demo workspace | ✅ working |
| Dashboard: 19 widgets, drag & drop, resize, density, saved layouts, presets | ✅ working |
| Orders, manual order entry, kitchen display (realtime + polling fallback) | ✅ working |
| Menu, categories, photos, recipe builder, food cost & margin | ✅ working |
| Inventory, movements, low-stock & expiry alerts | ✅ working |
| Finances: revenue/expenses CRUD, recurring, receipts upload, charts, CSV | ✅ working |
| Settings: profile, hours, branding, region, operations, notifications, users, roles, security | ✅ working |
| Integrations page with honest status + labelled demo mode | ✅ working (no live connectors) |
| Suppliers & purchase orders UI, Team shifts & time clock, Analytics, AI assistant | 🔜 next phases (DB already in place for suppliers/POs/shifts) |
| Receipt OCR, email delivery of invites, Stripe billing, i18n of the interface | 🔜 not implemented |

Integrations with iFood, Uber Eats, DoorDash, Stripe, Square, Shopify and Google need approved partner/developer accounts and their credentials before they can be connected. Until then Forkly shows them as *Coming soon*; delivery platforms offer a demo mode whose orders are flagged **Simulated** everywhere.
