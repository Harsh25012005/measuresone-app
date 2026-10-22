# MeasuresOne — Complete Rebuild Specification (Prompt for Claude Code)

> **How to use this file:** Give this whole document to Claude Code in a fresh, empty repository and say:
> *"Build this app exactly as specified in MEASURESONE_REBUILD_PROMPT.md. Work phase by phase (Section 14). After each phase, run typecheck/lint/tests and show me what's done before moving on."*
>
> This spec was written by reading the existing MeasuresOne codebase (Expo SDK 57, ~15k lines). It describes **every feature and flow the current app has**, then fixes the architectural problems found in it (Section 13). Where the old app and this spec disagree, **follow this spec**.

---

## 0. Instructions to the AI agent (read first)

1. **Expo has changed.** Before writing any code, read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ (or the latest stable SDK at the time you start — pin it and use matching package versions via `npx expo install`). Never guess an API from memory.
2. Use **TypeScript strict mode** everywhere. No `any`, no `as any` navigation casts.
3. **Every user-visible string goes through i18n** (English, Gujarati, Hindi). No hardcoded English in screens. Add keys to all three locales at the same time.
4. **Never call Supabase directly from a screen.** Screens → hooks → repositories → local DB. Only the sync engine and a small set of server-only services talk to Supabase.
5. **All schema changes are SQL migrations** checked into `supabase/migrations/`. Regenerate DB types after each one. No schema that exists only in the remote dashboard.
6. **No secrets in git.** `.env`, keystores, `credentials.json`, `google-services.json` are git-ignored. Use EAS Secrets / EAS environment variables.
7. Build in the phase order in Section 14. Each phase must end with: typecheck passing, lint passing, unit tests passing, the app launching on Android.
8. When something in this spec is ambiguous, pick the simplest option that fits an Indian tailor working one-handed at a busy shop counter, and write the decision down in `docs/DECISIONS.md`.

---

## 1. Product overview

**MeasuresOne** is an offline-first mobile app (Android first, iOS supported) for **tailoring / garment-stitching shops in India** (Gujarat especially). It replaces the shop owner's paper notebooks — the client ledger ("book number"), the measurement book, the bill book, and the staff wage register — with one phone app.

### Primary user
- The **shop owner** (often not tech-savvy, Gujarati-first, uses WhatsApp daily, works with one hand at a counter, unreliable internet).
- Future: shop **staff** logging in with limited permissions (see Section 12 — design the schema so this is possible, but the MVP only has the owner role).

### Core jobs
1. Client directory with phone, address and legacy **book number** (their paper ledger no.).
2. **Measurements** per client, using shop-configurable **measurement templates** (Shirt, Pant, Shirt + Pant, Kurta, Blazer, …).
3. **Orders** (stitching jobs) that move through `order_taken → cutting → stitching → ready → delivered`, with design photos, delivery/trial dates, rush flag, assigned staff.
4. **Bills & payments**: every order has a bill; record partial/full payments; see who owes money.
5. **Staff & wages**: daily / monthly / per-piece wage types; log piece-work; compute earnings.
6. **Dashboard & revenue**: today's deliveries, overdue orders, money to collect, monthly revenue, net earnings after staff cost.
7. **WhatsApp messaging** to clients (order ready, payment reminder, bill share) and to staff (earnings).
8. **Voice Order Assistant (Gujarati)**: create a client + measurements + order entirely by speaking — rule-based NLU, no LLM.
9. **3 languages** (en / gu / hi), **light/dark/system theme**, **first-run product tour**.
10. **Works fully offline** and syncs to the cloud when online, across multiple devices of the same shop.

---

## 2. Tech stack (decided)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Expo (SDK 57+) + React Native**, dev client (not Expo Go) | `expo-dev-client`; EAS Build |
| Language | TypeScript (strict) | |
| Routing | **Expo Router** (file-based, typed routes) | replaces the old hand-wired React Navigation stacks |
| Styling | **NativeWind v4** (Tailwind) + design tokens in `src/theme` | dark mode via `dark:` classes |
| Backend | **Supabase**: Postgres, Auth, Storage, Edge Functions | |
| Local DB | **expo-sqlite** + **Drizzle ORM** (`drizzle-orm/expo-sqlite`) with Drizzle migrations | typed queries, `useLiveQuery` for reactive screens |
| Server state | Local DB is the source of truth for UI; **TanStack Query** only for server-only reads (e.g. storage URLs) | |
| UI state | **Zustand** (small stores: wizard drafts, UI prefs) | no Redux |
| Forms | **react-hook-form + zod** | one zod schema per entity, shared by form + repository validation |
| i18n | **i18next + react-i18next + expo-localization** | namespaces per feature |
| Auth | Supabase Auth: email/password + **native Google Sign-In** (`@react-native-google-signin/google-signin`) | deep links for confirm/reset |
| Push | `expo-notifications` + Supabase Edge Function `send-push` | |
| Voice | `expo-speech` (TTS) + `expo-speech-recognition` (STT) | |
| Images | `expo-image-picker` + `expo-image` + `expo-image-manipulator` (compress before upload) | |
| Dates | `date-fns` | |
| Calendar | `react-native-calendars` | |
| Animation | `react-native-reanimated` (dev client makes it safe; the old app avoided it only because of Expo Go) | |
| Haptics | `expo-haptics` | |
| Fonts | Google Sans Flex (`@expo-google-fonts/google-sans-flex`) | |
| Testing | Jest + `@testing-library/react-native`; pgTAP or SQL tests for RLS | |
| Lint/format | ESLint (expo config) + Prettier | |
| Errors | Sentry (`@sentry/react-native`) — optional, behind env flag | |

App identity: name **MeasuresOne**, slug `measuresone`, scheme `measuresone://`, bundle/package id `com.measuresone.app`, portrait only.

---

## 3. Folder structure

Feature-based. Routes are thin; logic lives in `src/features/*`.

```
measuresone/
├── app.config.ts                 # Expo config (reads env, plugins, permissions)
├── eas.json
├── drizzle.config.ts
├── .env.example                  # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_URL_SCHEME
├── supabase/
│   ├── config.toml
│   ├── migrations/               # 0001_init.sql, 0002_rls.sql, 0003_triggers.sql, ...
│   ├── seed.sql                  # demo shop data for local dev
│   ├── tests/                    # RLS tests
│   └── functions/
│       └── send-push/index.ts
├── assets/
│   ├── images/                   # icon, splash, adaptive icons, logo
│   └── email-templates/          # confirm-signup.html, reset-password.html
├── docs/
│   ├── DECISIONS.md
│   └── SYNC.md                   # how sync works (write it as you build it)
└── src/
    ├── app/                      # Expo Router routes ONLY (thin screens that compose feature components)
    │   ├── _layout.tsx           # providers, fonts, splash, i18n bootstrap, auth gate
    │   ├── (auth)/
    │   │   ├── _layout.tsx
    │   │   ├── login.tsx
    │   │   ├── signup.tsx
    │   │   ├── forgot-password.tsx
    │   │   └── confirm-email.tsx
    │   ├── reset-password.tsx
    │   ├── onboarding/shop-setup.tsx
    │   └── (app)/
    │       ├── _layout.tsx       # requires session + shop
    │       ├── (tabs)/
    │       │   ├── _layout.tsx   # custom tab bar + centre "+" button
    │       │   ├── index.tsx     # Dashboard
    │       │   ├── customers.tsx
    │       │   ├── orders.tsx
    │       │   └── settings.tsx
    │       ├── customers/[id]/index.tsx
    │       ├── customers/[id]/edit.tsx
    │       ├── customers/[id]/measurements.tsx
    │       ├── customers/new.tsx
    │       ├── orders/new.tsx
    │       ├── orders/[id]/index.tsx
    │       ├── orders/[id]/edit.tsx
    │       ├── bills/index.tsx
    │       ├── bills/new.tsx
    │       ├── bills/[id].tsx
    │       ├── staff/index.tsx
    │       ├── staff/new.tsx
    │       ├── staff/[id]/index.tsx
    │       ├── staff/[id]/edit.tsx
    │       ├── staff/[id]/work-entry.tsx
    │       ├── revenue.tsx
    │       ├── calendar.tsx
    │       ├── search.tsx
    │       ├── notifications.tsx
    │       ├── transactions.tsx
    │       ├── assistant.tsx     # voice order assistant
    │       └── settings/
    │           ├── shop.tsx
    │           ├── measurement-templates/index.tsx
    │           └── measurement-templates/[id].tsx
    ├── features/
    │   ├── auth/          (components/, hooks/, services/, schemas.ts)
    │   ├── shop/
    │   ├── customers/
    │   ├── measurements/
    │   ├── orders/
    │   ├── billing/
    │   ├── staff/
    │   ├── dashboard/
    │   ├── revenue/
    │   ├── assistant/     (nlu/, conversation machine, components/)
    │   ├── notifications/
    │   └── tour/
    │   # each feature: components/, hooks/ (useCustomers, useCustomer(id) ...),
    │   #               repository.ts, schemas.ts (zod), types.ts, utils.ts, __tests__/
    ├── db/
    │   ├── schema.ts             # Drizzle tables (mirror of server tables + outbox + sync_meta)
    │   ├── client.ts             # open DB, run migrations, WAL
    │   ├── migrations/           # generated by drizzle-kit
    │   └── tx.ts                 # serialized transaction queue
    ├── sync/
    │   ├── engine.ts             # push outbox → pull changes
    │   ├── entities.ts           # per-entity config (columns, watermark, json/bool columns)
    │   ├── outbox.ts
    │   └── useSyncStatus.ts      # online/offline/pending-count/last-synced for UI
    ├── lib/
    │   ├── supabase.ts           # client with SecureStore-backed session storage
    │   ├── database.types.ts     # generated by `supabase gen types`
    │   ├── i18n.ts
    │   ├── format.ts             # currency (₹, en-IN grouping), dates, phone
    │   ├── whatsapp.ts
    │   ├── storage.ts            # image compress + upload
    │   ├── push.ts
    │   ├── haptics.ts
    │   └── mailApp.ts
    ├── components/ui/            # design system (Section 9)
    ├── theme/                    # tokens.ts, ThemeProvider.tsx, useTheme.ts
    ├── locales/{en,gu,hi}/       # common, auth, dashboard, customers, measurements, orders, billing, staff, revenue, settings, assistant .json
    └── types/                    # app-level shared types
```

---

## 4. Navigation & flows

### 4.1 Root gate (in `src/app/_layout.tsx`)
```
App start → load fonts, i18n (persisted language or device locale), theme → hide splash
  ├── password-recovery deep link active  → /reset-password
  ├── no session                          → /(auth)/login
  ├── session, no shop row                → /onboarding/shop-setup
  └── session + shop                      → /(app)/(tabs)   (start sync engine + push registration)
```

### 4.2 Auth flow
- **Login**: email + password, "Continue with Google", links to Sign up / Forgot password.
- **Sign up**: email + password (+ confirm). Detect "already registered" (Supabase returns a user with empty `identities`) and show a friendly message. On success → Confirm Email screen.
- **Confirm Email**: shows the address, "Open mail app" button (detect installed mail apps: Gmail, Outlook, Yahoo, ProtonMail, Spark, Apple Mail — needs iOS `LSApplicationQueriesSchemes`), "Resend email" with cooldown.
- **Forgot password**: send reset email to `measuresone://reset-password`. Store a "pending recovery" flag in AsyncStorage (PKCE links can drop `type=recovery`).
- **Reset password**: new password + confirm, then go to app.
- Deep-link handler must support all three Supabase link shapes: implicit fragment tokens (`#access_token=…`), PKCE `?code=…`, and `?token_hash=…&type=…`.
- Google Sign-In: native SDK → `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Custom branded HTML email templates for confirm-signup and reset-password (ship them in `assets/email-templates/` and document how to paste them into Supabase).

### 4.3 Onboarding — Shop setup
Fields: Shop name*, Owner name*, Phone, Address, Logo (optional image). Creates the `shops` row, seeds default **measurement templates** (Shirt, Pant, Shirt + Pant with suggested fields — Section 6.3), then enters the app and starts the **product tour**.

### 4.4 Main app: 4 tabs + centre "+" button
A **custom tab bar**: Dashboard · Customers · [ + ] · Orders · Settings. The bar is drawn with SVG and has a concave notch where the floating circular "+" sits. Tapping "+" opens the **Quick Add menu** (a card rising from the notch, animated) with 4 actions:
- **New Client** · **New Order** · **New Bill** · **New Staff**
- plus an entry to the **Voice Assistant** (mic) — from the Dashboard as well.

Billing has **no tab**; it lives under Settings (and Dashboard shortcut).

### 4.5 Screen map
```
Dashboard ─┬─ Search (text + voice) ── Customer detail / "Add as new client"
           ├─ Calendar (deliveries & trials by day) ── Order detail
           ├─ Notifications feed
           ├─ Transactions (all payments, searchable)
           ├─ Revenue
           ├─ Bills list
           ├─ Voice Assistant
           └─ Order detail / New order

Customers ─┬─ Customer detail [tabs: Profile | Orders | Bills]
           │     ├─ Edit customer
           │     ├─ Measurements (template-based form)
           │     ├─ New order (customer preselected) / Order detail
           │     └─ New bill (customer preselected) / Bill detail
           └─ New customer → (prompt) "Add measurements now?"

Orders ────┬─ New order (3-step wizard)
           └─ Order detail ── Edit order / Bill detail / Record payment

Settings ──┬─ Shop profile (edit)
           ├─ Language (en/gu/hi) · Appearance (light/dark/system)
           ├─ Billing & Payments → Bills list → Bill detail / New bill
           ├─ Staff → Staff detail → Edit / Add work entry
           ├─ Revenue
           ├─ Measurement Templates → Template detail (edit fields)
           ├─ How to use this app (replay tour)
           ├─ Sync status (last synced, pending changes, "Sync now")   ← new
           └─ Sign out (confirm)
```

---

## 5. Features in detail

### 5.1 Dashboard
- Greeting with owner name + shop name; offline/sync indicator.
- **Onboarding checklist** card until complete: add first customer → create first order → add first staff → create first bill. Stored in `shops.onboarding_checklist` (jsonb), auto-ticked by the matching create actions, dismissible.
- **Stat cards**: Due Today (orders with delivery today, not delivered) · This Month Revenue (sum of payments this month) · Money to Collect (total outstanding) · Today's Deliveries.
- **Overdue banner**: count of orders past delivery date and not delivered → opens Orders filtered to overdue.
- **Upcoming deliveries** list (next few orders by delivery date) → Order detail.
- **Top clients** (by total billed) → Customer detail.
- **Recent transactions** (last 5 payments) + "View all" → Transactions.
- Header icons: Calendar, Notifications. Search bar → Search screen. Shortcuts to Revenue and Billing. Mic button → Voice Assistant.

### 5.2 Customers
- **List**: search by name / phone / book number; filter "has balance due"; each row shows name, phone, outstanding balance badge. Empty state for first run vs. no search match. Pull-to-refresh triggers sync.
- **Form** (create/edit): Name*, Phone* (10-digit Indian mobile, validated, stored normalized), Address, Book number ("Client No."). Duplicate-phone warning within the shop. After creating → ask "Add measurements now?".
- **Detail** with 3 tabs:
  - **Profile**: contact info (tap phone → call / WhatsApp), book number, **outstanding balance**, measurement profile card(s) (template name, values, last updated, edit), "Send payment reminder" (WhatsApp, only if balance > 0), edit, delete (confirm; blocked or cascades — see Section 6 rules).
  - **Orders**: this client's orders, searchable, "+ New order".
  - **Bills**: this client's bills with paid/due, "+ New bill".
- **Quick-add customer sheet**: a bottom sheet (name + phone) usable from inside the Order form and Bill form without leaving them.

### 5.3 Measurements (unified, template-based)
- **Templates** are shop-wide (Settings → Measurement Templates). Default seeded: **Shirt**, **Pant**, **Shirt + Pant**. Owner can add custom templates (Kurta, Blazer, Safari, Sherwani, Lehenga, …). When a template is created, its fields are **auto-suggested from the name** (Section 6.3) and then editable.
- **Template detail**: rename template, add field, rename field, reorder fields (drag or up/down), delete field, delete template (confirm; customers keep their saved values).
- **Customer measurements screen**: pick a template → shows its fields as numeric inputs (inches, decimals allowed) + notes → save. A customer can have **one profile per template** (e.g., both a Shirt and a Pant profile). Show "last updated". Keep **history**: saving creates a new version; the latest is shown, older versions viewable.
- **Orders snapshot measurements**: when an order is created, copy the selected measurement values into the order item (`measurement_snapshot` jsonb) so later edits to the profile don't change what the tailor stitched.

### 5.4 Orders
**New order — 3-step wizard** (a "Save order now" shortcut is available from step 1 onward; only step 1 has required input):

| Step | Fields |
|---|---|
| 1. Who & what | Customer* (searchable dropdown + "Add client" quick sheet) · Garment type (Shirt / Pant / Shirt + Pant, or any measurement template) — default **Shirt** · Quantity (default **1**; for Shirt + Pant: separate shirt qty & pant qty) · Measurement profile (auto-picked from customer's matching template, changeable; "Add measurements" link) · Item notes (with voice dictation mic) |
| 2. Photos & dates | Design photos: one slot per piece (camera or gallery), separate shirt and pant photo rows, 3 visible per row, horizontally scrollable · Delivery date (**auto-suggested**, see 6.4; manual pick stops auto-suggest) · Trial date (optional) · Priority: Normal / Urgent · Rush order toggle → rush fee = `shop.rush_fee_percent` × total · Assign staff (active staff dropdown) · Bill book number (paper bill-book cross-reference) |
| 3. Payment | Total amount · Advance paid · Payment mode (Cash / UPI / Card / Bank transfer). UPI → confirm "Payment received?" dialog. Shows due amount live. |

On save:
1. Generate order number (Section 6.5).
2. Upload photos (compressed) — if offline, keep local URIs and upload later via the outbox (see 7.4).
3. Create `orders` row + `order_items` (one per garment type, with qty, unit price, measurement snapshot, notes).
4. If total > 0: create the linked **bill** (stitching charge = total, plus rush fee) and, if advance > 0, a **payment**.
5. Toast that says exactly what happened: "Order ORD-12 for Ramesh — ₹500 paid, ₹300 due" / "fully paid" / "no payment yet".
6. Tick onboarding checklist "first order".

**Edit order**: single scrolling form (not wizard) with the same fields except payment (payments are managed from the bill).

**Order list**: search by order number / customer name / phone; filters: status, priority (normal/urgent), overdue, show/hide delivered (badge with active filter count, "Reset" in a FilterNotice banner). Row: order number token, customer, piece count, delivery-date badge (red if overdue, amber if today), urgent flag, status chip. "All caught up" empty state showing how many delivered orders are hidden.

**Order detail**:
- Header: order number, urgent/rush badges, delivery & trial date.
- **Status stepper** (5 stages) — tap the next stage to advance (confirm when jumping or going back). When status becomes **ready** → offer "Send ready message on WhatsApp" + trigger `order_ready` push/notification log. When **delivered** → record `completed_at` on staff assignment.
- Items with measurement snapshot (label/value grid) and notes.
- Design photo gallery (tap to full screen, pinch zoom).
- Assigned staff (change).
- Payment summary: total, paid, balance, last payment mode → "View bill" / "Record payment" sheet.
- Customer actions: Call, WhatsApp "order ready", WhatsApp "payment reminder".
- Edit, Delete (confirm; deletes linked bill & payments too — soft delete).

### 5.5 Billing
- **Bills list** (grouped by client): search by client; filter by status (Paid / Partial / Unpaid). Each client row shows bill count, last bill date, outstanding. A **"Money to collect"** section on top lists clients with dues and the grand total.
- **New bill**: customer*, optionally link to an order; either a single **Bill amount** or **itemized** (Fabric cost, Stitching charge, Tax, Discount → auto total, never negative); "Paid in full" vs "Not paid yet" (+ partial amount + mode); after save, offer "Send bill on WhatsApp".
- **Bill detail**: total / paid / balance, status badge, customer (name, phone), linked order link, itemized breakdown, **payment history**, **Record payment** sheet (amount capped at balance, mode, date), **Share on WhatsApp**, Delete (confirm).
- `payment_status` is derived (unpaid / partial / paid) — compute it locally immediately and also via DB trigger server-side.

### 5.6 Staff
- **List**: search by name/phone; filter by wage type; active/inactive toggle.
- **Form**: Name*, Phone, Role (Tailor / Cutter / Helper / Ironing / other), Wage type (Daily / Monthly / Per piece), Wage amount; if per piece: price per **Shirt**, per **Pant**, per **Pair** (shirt+pant).
- **Detail**: performance — earnings this month / last month / all time, pieces this month; assigned open orders; work entries list (date, type, qty, rate, amount) with running total; "Add work entry"; "Send earnings on WhatsApp"; edit; deactivate; delete (unassigns their orders, never deletes orders).
- **Work entry form**: date (default today), work type (Shirt / Pant / Pair), quantity → shows rate applied (captured at entry time) and total; warns if no rate configured for that type.
- (Optional, recommended) **Salary payouts** table to record money paid to staff, so "net earnings" and "staff dues" are real.

### 5.7 Revenue
- Total revenue (= payments actually received, not billed) with note explaining that.
- This month / today / custom range.
- Summary: payments received, staff piece-work cost (+ salaries if payouts exist), **net earnings**, outstanding from customers.
- Month-by-month bar chart (last 6–12 months).

### 5.8 Dashboard sub-screens
- **Calendar**: month view; dots for delivery and trial dates; tap a day → list "Delivery — ORD-12 · Ramesh" / "Trial — …" → Order detail.
- **Search**: search clients by name/phone/book no. (text or **voice**); results → Customer detail; no match → "Add '<query>' as new client".
- **Notifications**: feed from `notifications_log` + local reminders (order ready, payment due, overdue), relative times ("just now", "5m ago", "3h ago", "2d ago"), mark read.
- **Transactions**: all payments, newest first, searchable by client, filter by mode and date range, total for filter.

### 5.9 Voice Order Assistant (Gujarati, rule-based)
A full-screen conversational screen: the app **speaks** each question (TTS, Gujarati voice `gu-IN`) and **listens** to the answer (STT `gu-IN`, fallback `en-IN`). A chat-style transcript shows both sides; a big mic button and a "listening…" overlay. The user can also type an answer.

Conversation state machine (implement as an explicit typed reducer in `features/assistant/machine.ts`):
```
greeting → askIntent → askClientType (new / existing)
  new:      collectNewClient (name + phone in one utterance) → [phone missing] collectNewClientPhoneOnly
  existing: collectExistingClientSearch → 0 matches → confirmCreateNewFallback
                                         1 match  → selected
                                         n matches → chooseClientFromList
→ askMeasurementOrOrder
  measurement: askGarmentForMeasurement (choose template) → collectMeasurementField (loop over template fields) → confirmMeasurementDone
→ askClothCount → askTotalAmount → askDiscount
→ (create order + bill) → confirmWhatsApp → done
```
NLU (`features/assistant/nlu/`, pure functions, 100% unit tested):
- `parseYesNo` (હા / ના / yes / no / હાં / નહીં …)
- `parseClientType` (નવો / જૂનો / new / old / existing)
- `parseGarmentChoice` → matches template names (Shirt/શર્ટ, Pant/પેન્ટ, both/બંને/જોડી …)
- `extractFirstNumber` — digits (incl. Gujarati digits ૦–૯) and Gujarati number words (એક, બે, ત્રણ, … દસ, વીસ, સો …), decimals ("સાડા" = +0.5)
- `extractPhone` — 10-digit mobile, tolerant of spaces and spoken digit groups
- `extractNameAroundPhone` — strip phone and filler words to get the name
- `parseClothCount` — "pair"/"જોડી" aware (1 pair = 1 shirt + 1 pant)
On completion: creates customer (if new), measurement profile (if collected, via the **same template system** as the rest of the app), order + item + bill, and offers a WhatsApp confirmation **always in Gujarati** (order no., item, qty, total, discount, net).

### 5.10 Settings
Shop summary card → Shop profile edit (logo, shop name*, owner name*, address, phone, rush fee %); Language; Appearance; Business section (Billing & Payments, Staff, Revenue, Measurement Templates); Help (replay tour); Sync status; Sign out (confirm; clears local DB for that user).

### 5.11 Product tour
- Welcome modal on first launch per user (key stored per user id in AsyncStorage; also mirrored in `shops.has_seen_guide`).
- Spotlight walkthrough highlighting the "+" button and the Quick Add rows in order: client → order → bill → staff, with Next / Skip. Replayable from Settings.

### 5.12 WhatsApp integration (`lib/whatsapp.ts`)
- Open `whatsapp://send?phone=91XXXXXXXXXX&text=…`; on failure fall back to `https://wa.me/91XXXXXXXXXX?text=…` (don't rely on `canOpenURL` — Android 11+ package visibility).
- Normalize phone: strip non-digits, 10 digits → prefix `91`.
- Templates (translated to the app language, except the assistant confirmation which is always Gujarati): **order ready**, **payment reminder** (amount due), **bill summary** (items, total, paid, balance), **staff earnings** (period, pieces, amount), **assistant order confirmation**. Include shop name and phone in every message.

### 5.13 Push notifications
- Register Expo push token after login (skip on simulator / no FCM config, never crash); upsert into `device_tokens` (shop_id, user_id, token, platform).
- Edge Function `send-push` sends to all tokens of the shop for events `order_ready`, `payment_due`, `overdue_digest`; writes `notifications_log`. Best-effort, never blocks UI.
- Local scheduled notification each morning: "3 deliveries today, 2 overdue" (optional, toggle in settings).

---

## 6. Business rules

### 6.1 Money
- Currency INR, display `₹1,23,456` (en-IN grouping), store as `numeric(12,2)`.
- Bill total = fabric_cost + stitching_charge + rush_fee + tax − discount, floor 0. Server: generated column.
- payment_status: paid_total ≤ 0 → `unpaid`; paid_total ≥ total → `paid`; else `partial`. Server trigger on payments insert/update/delete; client computes the same locally.
- A payment can't exceed the bill balance (UI cap + server check).
- Customer outstanding = Σ(bill total − Σ payments) over non-deleted bills.

### 6.2 Order status
`order_taken → cutting → stitching → ready → delivered`. Overdue = delivery_date < today AND status ≠ delivered. Store `status_changed_at`; keep an `order_status_history` table (who/when) for audit.

### 6.3 Measurement template field suggestions (`features/measurements/suggestions.ts`)
- **Shirt**: Chest, Shoulder, Sleeve, Length, Collar, Cuff, Biceps, Stomach
- **Pant / Pants / Trousers**: Waist, Hip, Seat, Length, Thigh, Knee, Bottom, Crotch
- **Shirt + Pant / Shirt & Pant / Suit pair**: Shirt fields + Pant fields (prefix duplicate names, e.g., "Shirt Length", "Pant Length")
- Keyword match (name contains): **blazer** (Chest, Waist, Shoulder, Sleeve, Length, Collar, Front Length, Back Length, Arm Hole, Pocket) · **coat** / **jacket** (Chest, Waist, Shoulder, Sleeve, Length, Collar, Arm Hole) · **kurta** (Chest, Waist, Shoulder, Sleeve, Length, Collar, Hip, Bottom) · **safari** (Chest, Waist, Shoulder, Sleeve, Length, Collar, Belt) · **lehenga** (Waist, Hip, Length, Flare, Blouse Chest, Blouse Length, Sleeve) · **sherwani** (Chest, Waist, Shoulder, Sleeve, Length, Collar, Hip, Arm Hole) · **suit** (Chest, Waist, Shoulder, Sleeve, Jacket Length, Pant Waist, Pant Length) · **vest** (Chest, Waist, Shoulder, Length, Arm Hole) · **pyjama** / **salwar** (Waist, Length, Hip, Bottom)
- Fallback: Chest, Waist, Shoulder, Length, Sleeve, Hip
- Field labels must be translatable: store a stable `field_key` (e.g. `chest`) + display `label`; built-in keys have gu/hi translations.

### 6.4 Delivery date suggestion (`features/orders/scheduling.ts`)
```
days = 2 (base) + 1 × total pieces + 0.5 × (open orders already assigned to the chosen staff)
date = today + ceil(days), skipping Sundays (make the weekly off-day a shop setting)
```
Suggest only for new orders; stop once the user picks a date manually; recompute when qty or staff changes.

### 6.5 Order numbers
Format `ORD-<n>`, unique per shop, numeric part increasing. Offline-safe strategy: client assigns `max(local n) + 1`; server has `unique (shop_id, order_number)`; on conflict during push, the sync engine reassigns the next free number, updates the local row and shows a toast "Order ORD-12 renumbered to ORD-14". Document this in `docs/SYNC.md`.

### 6.6 Deletes
All synced tables use **soft delete** (`deleted_at timestamptz`). Deleting a customer with orders/bills: confirm dialog listing what will be removed, then soft-delete the customer and cascade soft-delete to their orders, items, bills, payments, measurements. Deleting staff: unassign their orders, keep work entries (soft-delete staff).

### 6.7 Validation (zod, shared)
Phone: 10 digits starting 6–9. Names: 1–80 chars. Amounts ≥ 0, ≤ 10,00,000. Measurement values: 0 < v ≤ 200, one decimal place. Dates: trial ≤ delivery.

---

## 7. Data architecture

### 7.1 Principles
- **Multi-tenant by `shop_id`** on every business table (including child tables — no exceptions; the old app's `universal_measurement_fields` and `customer_measurements` lacked it, which broke shop-scoped sync).
- UUID primary keys generated **on the client** (`expo-crypto` `randomUUID`) so offline inserts need no round-trip.
- Every synced table has `created_at`, `updated_at` (server trigger sets `now()` on update), `deleted_at`.
- Postgres is the source of truth; SQLite is a replica + outbox.

### 7.2 Postgres schema (write as `supabase/migrations/0001_init.sql`)

```sql
-- Enums
create type order_status   as enum ('order_taken','cutting','stitching','ready','delivered');
create type order_priority as enum ('normal','urgent');
create type payment_status as enum ('unpaid','partial','paid');
create type payment_mode   as enum ('cash','upi','card','bank_transfer');
create type wage_type      as enum ('daily','monthly','per_piece');
create type work_item_type as enum ('shirt','pant','pair');
create type member_role    as enum ('owner','manager','staff');
create type notification_type   as enum ('order_ready','payment_due','overdue_digest');
create type notification_status as enum ('pending','sent','failed');

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  shop_name text not null,
  owner_name text not null,
  phone text, address text, logo_url text,
  primary_color text not null default '#1E40AF',
  rush_fee_percent numeric(5,2) not null default 0,
  weekly_off_day smallint not null default 0,          -- 0 = Sunday
  has_seen_guide boolean not null default false,
  onboarding_checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membership (owner now; staff logins later)
create table shop_members (
  shop_id uuid references shops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role member_role not null default 'owner',
  staff_id uuid,                                         -- link a login to a staff row
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table customers (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  name text not null, phone text, address text, book_number text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index on customers (shop_id, updated_at);
create unique index customers_phone_per_shop on customers (shop_id, phone) where deleted_at is null and phone is not null;

create table measurement_templates (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  name text not null, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table measurement_template_fields (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  template_id uuid not null references measurement_templates(id) on delete cascade,
  field_key text not null, label text not null, unit text not null default 'in', sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- One row per saved version; the latest (by created_at) per (customer, template) is "current"
create table customer_measurements (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  template_id uuid references measurement_templates(id) on delete set null,
  template_name text not null,                         -- denormalized so history survives template deletion
  values jsonb not null default '{}'::jsonb,           -- { "chest": 40, "waist": 34.5 } keyed by field_key
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index on customer_measurements (customer_id, template_id, created_at desc);

create table staff (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  name text not null, phone text, role text,
  wage_type wage_type not null default 'per_piece',
  wage_amount numeric(12,2) not null default 0,
  rate_shirt numeric(12,2), rate_pant numeric(12,2), rate_pair numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table orders (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  order_number text not null,
  customer_id uuid not null references customers(id),
  order_date date not null default current_date,
  delivery_date date, trial_date date,
  status order_status not null default 'order_taken',
  status_changed_at timestamptz not null default now(),
  priority order_priority not null default 'normal',
  is_rush boolean not null default false,
  rush_fee numeric(12,2) not null default 0,
  assigned_staff_id uuid references staff(id) on delete set null,
  bill_book_number text, notes text,
  design_photo_urls text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (shop_id, order_number)
);
create index on orders (shop_id, status, delivery_date);

create table order_items (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  garment_type text not null,                          -- template name at time of order
  template_id uuid references measurement_templates(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  measurement_id uuid references customer_measurements(id) on delete set null,
  measurement_snapshot jsonb,                          -- copy of values at order time
  photo_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table order_status_history (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status, to_status order_status not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table staff_assignments (                       -- replaces staff_orders
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  task text, assigned_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table staff_work_entries (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  work_type work_item_type not null, quantity int not null check (quantity > 0),
  rate_applied numeric(12,2) not null, amount numeric(12,2) generated always as (quantity * rate_applied) stored,
  work_date date not null default current_date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table staff_payouts (                           -- new: money paid to staff
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0), mode payment_mode, paid_on date not null default current_date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table bills (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id) on delete set null,
  bill_number text,
  fabric_cost numeric(12,2) not null default 0,
  stitching_charge numeric(12,2) not null default 0,
  rush_fee numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (greatest(fabric_cost + stitching_charge + rush_fee + tax - discount, 0)) stored,
  payment_status payment_status not null default 'unpaid',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index one_bill_per_order on bills (order_id) where order_id is not null and deleted_at is null;

create table payments (
  id uuid primary key, shop_id uuid not null references shops(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  customer_id uuid not null references customers(id),
  amount numeric(12,2) not null check (amount > 0),
  mode payment_mode not null default 'cash',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table device_tokens (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique, platform text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table notifications_log (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null, order_id uuid references orders(id) on delete set null,
  type notification_type not null, status notification_status not null default 'pending',
  title text, body text, read_at timestamptz, sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
```

**Migration `0002_rls.sql`**
- `create function is_shop_member(p_shop uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from shop_members where shop_id = p_shop and user_id = auth.uid()) $$;`
- Enable RLS on **every** table. Policy for every business table: `using (is_shop_member(shop_id)) with check (is_shop_member(shop_id))`.
- `shops`: select/update if member; insert if `owner_id = auth.uid()`; trigger on insert adds the owner to `shop_members`.
- Write RLS tests proving user A cannot read/write shop B's rows.

**Migration `0003_triggers.sql`**
- `set_updated_at()` BEFORE UPDATE trigger on all tables.
- `recalc_bill_status()` AFTER INSERT/UPDATE/DELETE on payments → updates `bills.payment_status`.
- `check_payment_not_exceeding_balance()` BEFORE INSERT on payments.
- `log_order_status()` AFTER UPDATE OF status on orders → inserts `order_status_history`, sets `status_changed_at`.
- Soft-delete cascade function (customer → orders/items/bills/payments/measurements; order → items/bill/payments).

**Storage buckets** (migration `0004_storage.sql`): `shop-logos` (public read) and `design-photos` (private; signed URLs). Path convention `{shop_id}/{entity_id}/{filename}.jpg`; storage RLS: first path segment must be a shop the user is a member of.

**Edge Functions**: `send-push` (Expo push API), optional `daily-digest` (cron via `pg_cron` → overdue/delivery summary).

### 7.3 Local SQLite (Drizzle)
Mirror every synced table (same column names; jsonb/arrays as TEXT JSON; booleans as INTEGER; numerics as REAL). Plus:
```
outbox      (id, entity, row_id, op 'upsert'|'delete', payload json, attempts int, last_error text, created_at)
sync_meta   (entity primary key, last_pulled_at text)
pending_uploads (id, local_uri, bucket, path, entity, row_id, column, status, attempts)
```
Synced entities: shops (own row), customers, measurement_templates, measurement_template_fields, customer_measurements, staff, orders, order_items, order_status_history, staff_assignments, staff_work_entries, staff_payouts, bills, payments, notifications_log (pull only).

### 7.4 Sync engine (`src/sync/`)
- **Writes**: repository writes the local row + an outbox entry **in the same SQLite transaction**. All transactions go through one serialized queue (`db/tx.ts`) — SQLite has no nested transactions.
- **Push**: drain outbox in order; `upsert` (on conflict id) rather than separate insert/update; deletes are `update set deleted_at`. On a **permanent error** (constraint/validation, 4xx) mark the entry failed, surface it in Sync status, and **continue** (don't let one bad op block the queue forever — the old app did). Retry transient errors with exponential backoff. Handle order-number conflict per 6.5.
- **Pull**: per entity, `select * where shop_id = :shop and updated_at > :watermark order by updated_at limit 1000` (paginate). Upsert into SQLite; rows with `deleted_at` set are removed/hidden locally (this propagates deletes to other devices — the old app never did). Watermark = max `updated_at` seen (server time), never device time.
- **Conflicts**: last-write-wins by server `updated_at`; skip pulling a row whose id still has a pending outbox entry (local edit wins until pushed).
- **Uploads**: photos picked offline are stored in app storage, queued in `pending_uploads`; after upload, the row's URL column is patched via a normal outbox upsert.
- **Triggers**: app start, login, network reconnect (NetInfo), app foreground (AppState), after each local write (debounced 1s), pull-to-refresh, manual "Sync now", every 5 min while foreground.
- **Status hook** `useSyncStatus()` → `{ online, syncing, pendingCount, failedCount, lastSyncedAt }`, shown on Dashboard and Settings.
- **Sign out**: stop sync, wipe local DB (warn if outbox not empty).
- Unit-test the engine with a fake Supabase client.

### 7.5 Repository & hooks pattern
```ts
// features/customers/repository.ts
export const customersRepo = {
  list(shopId, { search, hasBalance }),   // Drizzle query
  get(id),
  create(input: CustomerInput),           // zod-parse → insert + outbox in one tx → kickSync()
  update(id, patch),
  softDelete(id),                         // cascade per 6.6
};
// features/customers/hooks.ts
export const useCustomers = (filters) => useLiveQuery(...);  // re-renders on local DB change
```
Derived queries live in repositories as SQL (outstanding balance per customer, revenue per month, open orders per staff, top clients) — not in screen code.

---

## 8. State, providers, configuration
- Providers in `_layout.tsx`: `GestureHandlerRootView → SafeAreaProvider → ThemeProvider → I18nProvider → ToastProvider → AuthProvider → SyncProvider → TourProvider`.
- `AuthProvider` exposes `{ session, user, shop, loading, passwordRecovery, signInWithEmail, signUpWithEmail, signInWithGoogle, resendConfirmation, resetPassword, completePasswordReset, signOut, refreshShop }`; `useShop()` throws if no shop (only used inside `(app)`).
- Supabase session persisted in **expo-secure-store** (chunked adapter for large tokens).
- Language persisted in AsyncStorage (`measuresone:language`), first run from device locale (`gu` → Gujarati, `hi` → Hindi, else English). Theme persisted (`measuresone:theme`).
- Env via `app.config.ts` `extra` / `EXPO_PUBLIC_*`. Config plugins: splash, secure-store, font, localization, datetimepicker, image-picker (camera + photos permission text), google-signin (iosUrlScheme), sqlite, notifications, speech-recognition (mic + speech permission text). iOS `LSApplicationQueriesSchemes`: googlegmail, ms-outlook, ymail, protonmail, readdle-spark, message, whatsapp.
- EAS profiles: development (dev client, internal), preview (internal APK), production (auto-increment, AAB). Android arm64-only for APK size.

---

## 9. Design system (`src/components/ui/`)

Clean, large-touch-target UI for one-handed use (min 48dp targets, base font 16, big numbers for money). Brand primary blue with semantic colors (success green, warning amber, danger red), full dark-mode palette, status bar color matched to screen background.

Components (each with variants, dark mode, accessibility labels, and a story on the internal **Component Showcase** screen available in dev builds only):
`Button` (primary/secondary/outline/ghost/danger; sm/md/lg; loading; icon) · `IconButton` · `InputField` (label, error, helper, left/right icon, numeric mode, voice-dictation mic slot) · `SearchBar` (with voice) · `Dropdown` (searchable, "+ add new" footer action) · `RadioGroup` · `Checkbox` · `Toggle` · `DatePickerField` · `ImagePickerField` (camera/gallery sheet, preview, remove) · `Card` · `Badge` (status colors) · `Avatar` (initials/photo) · `Header` (back, title, actions) · `BottomSheet` & `CenterModal` · `Toast` (provider + `useToast`) · `EmptyState` (icon, title, message, CTA) · `LoadingSpinner` / skeletons · `FilterNotice` (active filters + reset) · `OrderProgressStepper` (5 stages) · `StatCard` · `Money` (formatted ₹ text) · `VoiceListeningOverlay` · `QuickAddCustomerSheet` · `RecordPaymentSheet` · `ConfirmDialog` · `SyncBadge` · `GoogleIcon`.
App-level: `CustomTabBar` (SVG notch), `QuickAddMenu` (SVG card with matching notch, staggered animation, tour highlight support), `TourWelcome`, `TourSpotlight`.

---

## 10. Internationalization
- Locales `en`, `gu`, `hi`; namespaces: `common, auth, dashboard, customers, measurements, orders, billing, staff, revenue, settings, assistant`.
- Pluralization and interpolation for counts and money (`{{count}} orders`, `₹{{amount}} due`).
- Measurement field labels and template names: built-in keys translated, custom user-typed ones shown as typed.
- WhatsApp templates translated per app language (assistant confirmation always Gujarati).
- Add a script/test that fails CI if any key exists in one locale but not the others.

---

## 11. Non-functional requirements
- **Offline**: every screen except auth, photo upload and push works with no network. Clear offline banner, never a spinner forever.
- **Performance**: lists virtualized (`FlashList`), cold start < 2.5 s on a mid-range Android, images compressed to ≤ 1280px / ~70% JPEG before upload.
- **Accessibility**: labels on all icon buttons, dynamic font size supported, contrast AA in both themes.
- **Security**: RLS on all tables, no service-role key in the app, secrets only in EAS env, session in SecureStore.
- **Reliability**: no unhandled promise rejections; all "fire-and-forget" side effects (push, WhatsApp, upload) wrapped and logged.
- **Testing**: unit tests for NLU, scheduling, money/status math, suggestions, sync engine, zod schemas; component tests for order wizard and record-payment; RLS tests.

---

## 12. Future-ready (design for, don't build yet)
- Staff logins with role-based screens (`shop_members.role`, `staff_id` link) — staff see only their assigned orders and can update status.
- Multiple shops per owner (shop switcher).
- PDF bill / measurement slip generation and sharing (`expo-print` + `expo-sharing`).
- Thermal printer support for order tokens.
- SMS fallback where WhatsApp isn't installed.
- Data export (CSV) and backup.

---

## 13. Problems found in the old codebase — must be fixed in the rebuild
1. **Three overlapping measurement systems**: legacy `measurements` table (fixed columns chest/waist/… + `custom_fields` json), `measurement_field_definitions` (shop custom fields scoped Shirt/Pant/Both), and the newer `universal_measurement_templates` + `customer_measurements`. Customer detail, order form and measurement form use the new one, but the **voice assistant still writes the legacy table** and customer detail's delete still hits the legacy table. → One template-based system (Section 5.3 / 7.2).
2. **Deletes never propagate to other devices** — pull only upserts. → Soft delete + `deleted_at` in pull.
3. **`book_number` missing from the customers sync column list**, so book numbers never reach other devices. → Column lists generated from the shared schema, with a test.
4. **Child tables without `shop_id`** (`universal_measurement_fields`, `customer_measurements`), so pulls weren't shop-scoped. → `shop_id` on every table.
5. **One failing outbox op blocks the whole queue forever.** → Mark failed, continue, surface in UI.
6. **Several features bypass the offline layer** and call Supabase directly (staff work entries, staff_orders, legacy measurements, measurement field definitions, shop logo update, revenue's work-entry query) → they fail offline. → Everything through repositories.
7. **Order number race** when two devices create orders offline. → Section 6.5.
8. **Hardcoded English strings** in measurement screens and customer detail ("Customer Measurements", "Edit Measurements", "Please select a measurement template"…). → All strings in i18n.
9. **RLS in `002_universal_measurements.sql` references `staff.user_id`, which doesn't exist**; only one migration file is in the repo — the rest of the schema lives only in the Supabase dashboard. → Full migrations in repo + `shop_members` model.
10. **`credentials.json` with Android keystore passwords is committed to git.** → Git-ignore; use EAS-managed credentials. (Rotate the old keystore passwords if the repo was ever shared.)
11. Untyped navigation casts (`navigate('SettingsTab' as any, …)`), the same Order/Bill screens registered in three stacks. → Expo Router typed routes, single route per screen.
12. Payment modes stored as free text ("Cash", "UPI") with mixed casing. → `payment_mode` enum.
13. `order_items` stored one combined item even for Shirt + Pant orders during edit. → One item per garment type, always.
14. Sync watermark could use device time when a pull returned nothing. → Use server timestamps only.

---

## 14. Build phases (do them in order)

| Phase | Deliverable | Done when |
|---|---|---|
| **1. Foundation** | Expo app with Router, TS strict, NativeWind, fonts, theme (light/dark/system), i18n (3 locales), ESLint/Prettier/Jest, env config, EAS profiles, design-system primitives + dev showcase | App boots on Android dev client; showcase renders in both themes and all 3 languages |
| **2. Backend** | `supabase/` project: migrations 0001–0004, RLS, triggers, storage, seed, generated types, RLS tests | `supabase db reset` works locally; RLS tests pass |
| **3. Auth & onboarding** | Login, signup, confirm email, forgot/reset (all deep-link shapes), Google sign-in, shop setup + default template seeding, root gate | New user can sign up → confirm → create shop → land on empty dashboard |
| **4. Local DB & sync** | Drizzle schema + migrations, tx queue, repositories skeleton, outbox, sync engine, upload queue, sync status UI, tests | Create a row offline on device A → appears on device B after reconnect; delete propagates |
| **5. Customers & measurements** | Customer list/detail/form, quick-add sheet, measurement templates (settings) with suggestions, customer measurement form with versions | Full CRUD offline; templates editable |
| **6. Orders** | 3-step wizard, edit, list with filters, detail with stepper, photos (offline queue), scheduling suggestion, order numbering | Order with photos created offline, synced, status advanced to delivered |
| **7. Billing** | Auto bill from order, bills list/grouped, new bill (simple/itemized), detail, record payment, status derivation | Outstanding balances correct everywhere |
| **8. Staff** | Staff CRUD, work entries, payouts, earnings report, assignment from orders | Earnings match work entries × rates |
| **9. Dashboard & revenue** | Dashboard cards, checklist, overdue, top clients, calendar, search (text), transactions, revenue with chart | Numbers verified against seed data in tests |
| **10. Communication** | WhatsApp templates & sharing, push registration, `send-push` function, notifications feed, morning local reminder | Marking an order ready offers WhatsApp + sends push |
| **11. Voice** | Voice search, dictation in notes, Gujarati Voice Order Assistant (machine + NLU + UI) | Full spoken order creates customer, measurement, order, bill; NLU tests pass |
| **12. Polish** | Product tour, custom tab bar + Quick Add animation, empty states, skeletons, accessibility pass, performance pass, app icons/splash, store build | Production AAB builds on EAS |

---

## 15. Acceptance checklist (whole app)
- [ ] Owner can run the shop for a full day **in airplane mode** and everything syncs correctly afterward.
- [ ] Two phones logged into the same shop see the same data within one sync cycle, including deletes.
- [ ] Every screen is fully translated in English, Gujarati and Hindi; no hardcoded strings.
- [ ] Light and dark themes look correct on every screen.
- [ ] Order → bill → payment → status → outstanding balance numbers agree on Customer detail, Bills list, Dashboard and Revenue.
- [ ] A Gujarati speaker can create an order end-to-end by voice.
- [ ] RLS tests prove tenant isolation; no secrets in git.
- [ ] Typecheck, lint, unit tests, locale-key check all pass in CI.
