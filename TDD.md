# Lost-N-Found — Technical Design Document

**Author:** Sanjay Sundaram  
**Date:** 2026-04-16  
**Status:** Draft  
**Version:** 2.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Roles](#3-user-roles)
4. [Core User Flows](#4-core-user-flows)
5. [System Architecture](#5-system-architecture)
6. [Data Models](#6-data-models)
7. [API Design](#7-api-design)
8. [Verification & Proof System](#8-verification--proof-system)
9. [Messaging System](#9-messaging-system)
10. [Payment System](#10-payment-system)
11. [Privacy & Information Disclosure](#11-privacy--information-disclosure)
12. [Frontend Pages & Components](#12-frontend-pages--components)
13. [Authentication & Authorization](#13-authentication--authorization)
14. [Notifications](#14-notifications)
15. [Tech Stack](#15-tech-stack)
16. [Infrastructure & Deployment](#16-infrastructure--deployment)
17. [Security Considerations](#17-security-considerations)
18. [Edge Cases & Failure Modes](#18-edge-cases--failure-modes)
19. [Future Enhancements](#19-future-enhancements)
20. [Milestones & Implementation Order](#20-milestones--implementation-order)

---

## 1. Overview

Lost-N-Found is a bounty-based web application for UC Berkeley students that turns finding lost items into a scavenger hunt. Students who lose items post bounty tickets describing what they lost and how much they'll pay to get it back. Other students who find matching items claim the bounty by submitting proof (photo + location). The owner verifies the proof, and if it's their item, the two coordinate a meetup via in-app messaging to complete the handoff.

**How it works:**

1. A student loses an item on campus.
2. They file a bounty ticket on the app: a description of the item, the general area they think they lost it, and a bounty amount ($2 minimum, no cap — owner decides what the item is worth to them).
3. The ticket is posted publicly. Other students can now hunt for the item.
4. A student finds what they believe is the matching item. They "claim the bounty" by uploading a photo of the item and noting where they found it.
5. The owner receives a notification and reviews the proof. They can see the photo and the location. The owner decides: is this my item?
6. If the owner verifies it's theirs, an in-app messaging thread opens between the owner and finder so they can coordinate a meetup for the handoff.
7. Once the owner confirms delivery (marks the item as received), the bounty payment is released: **85% to the finder, 15% platform fee** to Lost-N-Found.

---

## 2. Goals & Non-Goals

### Goals

- Simple, fast UX optimized for mobile (students will use this on the go)
- Create a scavenger-hunt dynamic that makes finding items fun and rewarding
- Let owners set bounty amounts that reflect how much the item is worth to them
- Provide a safe, structured way for owners and finders to coordinate handoffs via in-app messaging
- Protect both parties through escrow (bounty is held until delivery is confirmed)
- Generate revenue via a 15% platform fee on each successful transaction

### Non-Goals

- Not a general marketplace or auction site
- Not a real-time tracking or GPS-based system
- Not handling item shipping or mail delivery — handoffs are in-person on campus
- Not expanding beyond UC Berkeley campus in v1
- Not an insurance or liability platform — we facilitate connection, not guarantees

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Owner** | A student who lost an item and files a bounty ticket to get it back |
| **Finder** | A student who finds an item matching a bounty ticket and claims the bounty |
| **Admin (Founder)** | Sanjay — manages disputes, monitors transactions, receives 15% platform fees |

A single user can be both an owner and a finder across different items.

---

## 4. Core User Flows

### 4.1 Owner Flow — Filing a Bounty Ticket

```
1. Owner opens app → taps "I Lost Something"
2. Owner fills out the bounty ticket form:
   a. Item description (required)
      - e.g., "Blue Hydro Flask with a Cal Hiking Club sticker on the back,
        dent on the bottom"
   b. Item category (required, dropdown)
      - Water Bottle, Phone, Wallet, Keys, Clothing, Bag, Electronics,
        Book, ID/Card, Headphones, Charger, Other
   c. General area where they think they lost it (required)
      - e.g., "Dwinelle Hall" or "somewhere between Sather Gate and Moffitt"
      - Selected from a campus location dropdown or typed freeform
   d. Date/time they think they lost it (required)
      - Defaults to "today" with a time picker
   e. Bounty amount (required, minimum $2, no maximum)
      - Owner decides what the item is worth to them
      - UI shows suggested ranges based on category:
        "Most people offer $2–$5 for water bottles, $10–$25 for electronics"
   f. Optional: reference photo (a photo of the item from before they lost it,
      e.g., from their camera roll — helps finders identify it)
3. Owner completes escrow payment for the bounty amount via Stripe
4. App automatically attaches:
   a. Timestamp (UTC, displayed in PT) for when the ticket was filed
   b. Owner's user ID (private — not shown on the public ticket)
5. Bounty ticket is posted publicly with:
   - Item description
   - Category
   - General area lost
   - Date/time lost
   - Bounty amount
   - Reference photo (if provided)
   - Ticket filed timestamp
   - Status: "Active"
6. Owner receives confirmation notification
```

### 4.2 Finder Flow — Claiming a Bounty

```
1. Finder browses active bounty tickets or searches/filters by
   category, location, bounty amount, date
2. Finder finds an item they believe matches a ticket
3. Finder taps "Claim Bounty" on the ticket
4. Finder submits proof:
   a. Photo(s) of the found item (required, up to 5 photos)
   b. Location where they found it (required — pin on campus map or typed address)
   c. Brief note (optional)
      - e.g., "Found this under a desk in Dwinelle 155, looks like
        it matches your description"
5. App automatically attaches:
   a. Timestamp of when the bounty was claimed
   b. Finder's user ID (revealed to owner only after claim is submitted)
6. Owner is notified: "Someone found what might be your item!"
7. Finder sees status: "Pending owner review"
```

### 4.3 Owner Verification Flow — Reviewing a Claim

```
1. Owner receives notification and opens the claim
2. Owner sees:
   a. Finder's proof photos
   b. Location where the item was found
   c. Finder's optional note
   d. Timestamp of when it was found
3. Owner decides:
   ┌─────────────────────────┐
   │   "Yes, that's mine!"   │ → Claim APPROVED → messaging unlocked
   └─────────────────────────┘
   ┌─────────────────────────┐
   │   "No, not my item"     │ → Claim REJECTED → ticket stays active
   └─────────────────────────┘
4. If APPROVED:
   a. In-app messaging thread opens between owner and finder
   b. Ticket status changes to "Found — Pending Pickup"
   c. Both parties coordinate a meetup time and place via messages
5. If REJECTED:
   a. Finder is notified: "The owner said this isn't their item"
   b. Ticket remains active for other finders
   c. Finder can claim other bounties (no penalty for wrong finds)
```

### 4.4 Handoff & Payment Flow

```
1. Owner and finder coordinate meetup via in-app messaging
2. They meet in person. Finder hands over the item.
3. Owner confirms receipt in the app → taps "I Got My Item"
4. Payment is released from escrow:
   - 85% of bounty → Finder (via Stripe Connect)
   - 15% of bounty → Platform (Sanjay)
5. Ticket status changes to "Resolved"
6. Both parties can leave optional ratings for each other
```

### 4.5 Dispute Flow

```
1. Either party can open a dispute at any point after a claim is approved:
   - Finder says: "Owner won't respond / won't meet up / is stalling"
   - Owner says: "Item was damaged / wrong item delivered / finder no-showed"
2. Admin (Sanjay) reviews the dispute manually, including:
   - Message history between the parties
   - Proof photos
   - Claim timeline
3. Admin can:
   a. Release payment to finder (if owner is stalling)
   b. Refund owner (if finder delivered wrong item)
   c. Cancel the claim and re-open the ticket
   d. Ban fraudulent users
4. Disputes are logged for audit purposes
```

### 4.6 Ticket Expiry

```
1. Bounty tickets expire after 30 days if unclaimed
2. 3 days before expiry, the owner is notified and can:
   a. Extend the ticket for another 30 days (no additional charge)
   b. Increase the bounty to attract more searchers
   c. Let it expire → escrow is refunded in full to the owner
3. Expired tickets are archived and no longer publicly visible
```

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                 │
│                    React + Tailwind CSS                 │
│           Mobile-first responsive SPA                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Next.js API Routes)       │
│                   Route Handlers + Server Actions       │
├─────────────────────────────────────────────────────────┤
│  Auth Module    │  Tickets Module │  Claims Module      │
│  (NextAuth.js)  │  (CRUD + search)│  (proof + verify)   │
├─────────────────────────────────────────────────────────┤
│  Payment Service │  Messaging     │  Notification       │
│  (Stripe)        │  Service       │  Service (email)    │
└────────┬─────────┴───────┬────────┴──────┬──────────────┘
         │                 │               │
         ▼                 ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Stripe API │  │   Supabase   │  │  Resend API  │
│   (payments) │  │   Realtime   │  │  (email)     │
└──────────────┘  │  (messaging) │  └──────────────┘
                  └──────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Database (PostgreSQL via Supabase)          │
│              + Supabase Storage (photos)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Data Models

### 6.1 `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `email` | VARCHAR | Must be `@berkeley.edu` |
| `name` | VARCHAR | Display name |
| `avatar_url` | VARCHAR | Profile photo URL |
| `stripe_customer_id` | VARCHAR | Stripe customer ID for payments (owner side) |
| `stripe_account_id` | VARCHAR | Stripe Connect account for payouts (finder side, nullable until first payout) |
| `rating_avg` | FLOAT | Average rating from completed transactions (nullable) |
| `rating_count` | INT | Number of ratings received |
| `is_banned` | BOOLEAN | Default false |
| `created_at` | TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | Last update |

### 6.2 `tickets`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `owner_id` | UUID (FK → users) | Who lost the item |
| `status` | ENUM | `active`, `found`, `resolved`, `expired`, `cancelled`, `disputed` |
| `category` | ENUM | `water_bottle`, `phone`, `wallet`, `keys`, `clothing`, `bag`, `electronics`, `book`, `id_card`, `headphones`, `charger`, `other` |
| `description` | TEXT | Item description (public) |
| `general_area` | VARCHAR | Approximate area where item was lost (e.g., "Dwinelle Hall") |
| `lost_at` | TIMESTAMP | When the owner thinks they lost the item |
| `reference_photo_url` | VARCHAR | Optional photo of the item from before it was lost |
| `bounty_amount_cents` | INT | Bounty in cents (minimum 200) |
| `stripe_payment_intent_id` | VARCHAR | Stripe PI for escrow hold on bounty |
| `approved_claim_id` | UUID (FK → claims, nullable) | The claim that was approved |
| `filed_at` | TIMESTAMP | Auto-set when ticket is created |
| `expires_at` | TIMESTAMP | Auto-set to `filed_at + 30 days`, extendable |
| `resolved_at` | TIMESTAMP | Nullable, set when owner confirms receipt |
| `created_at` | TIMESTAMP | Record creation |

### 6.3 `claims`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `ticket_id` | UUID (FK → tickets) | The bounty ticket being claimed |
| `finder_id` | UUID (FK → users) | Who found the item |
| `status` | ENUM | `pending_review`, `approved`, `rejected`, `completed`, `disputed`, `cancelled` |
| `proof_photo_urls` | TEXT[] | Array of photo URLs submitted as proof |
| `found_location` | TEXT | Where the finder found the item |
| `found_location_lat` | FLOAT | Latitude of find location (nullable) |
| `found_location_lng` | FLOAT | Longitude of find location (nullable) |
| `finder_note` | TEXT | Optional note from the finder |
| `found_at` | TIMESTAMP | Auto-set when claim is submitted |
| `approved_at` | TIMESTAMP | Nullable, set when owner approves |
| `completed_at` | TIMESTAMP | Nullable, set when owner confirms receipt |
| `created_at` | TIMESTAMP | Record creation |

### 6.4 `messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `thread_id` | UUID (FK → message_threads) | The conversation thread |
| `sender_id` | UUID (FK → users) | Who sent the message |
| `body` | TEXT | Message content |
| `is_read` | BOOLEAN | Default false |
| `created_at` | TIMESTAMP | When the message was sent |

### 6.5 `message_threads`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `claim_id` | UUID (FK → claims) | The approved claim this thread is for |
| `owner_id` | UUID (FK → users) | The ticket owner |
| `finder_id` | UUID (FK → users) | The finder |
| `status` | ENUM | `active`, `closed` |
| `created_at` | TIMESTAMP | Thread creation (when claim is approved) |

### 6.6 `transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `ticket_id` | UUID (FK → tickets) | Associated ticket |
| `claim_id` | UUID (FK → claims, nullable) | Associated claim |
| `type` | ENUM | `escrow_hold`, `payout_finder`, `platform_fee`, `refund` |
| `amount_cents` | INT | Amount in cents |
| `stripe_transfer_id` | VARCHAR | Stripe transfer reference (nullable) |
| `status` | ENUM | `pending`, `completed`, `failed` |
| `created_at` | TIMESTAMP | Transaction time |

### 6.7 `disputes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `claim_id` | UUID (FK → claims) | Associated claim |
| `opened_by` | UUID (FK → users) | Who opened the dispute |
| `reason` | TEXT | Free-text explanation |
| `resolution` | TEXT | Admin's resolution notes (nullable) |
| `status` | ENUM | `open`, `resolved_upheld`, `resolved_reversed`, `resolved_cancelled` |
| `created_at` | TIMESTAMP | Dispute opened |
| `resolved_at` | TIMESTAMP | Nullable |

### 6.8 `ratings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `claim_id` | UUID (FK → claims) | The completed claim |
| `rater_id` | UUID (FK → users) | Who is leaving the rating |
| `rated_id` | UUID (FK → users) | Who is being rated |
| `score` | INT | 1–5 stars |
| `comment` | TEXT | Optional comment (nullable) |
| `created_at` | TIMESTAMP | Rating time |

---

## 7. API Design

All API routes are under `/api/`. Authentication is required unless noted.

### 7.1 Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js handlers (Google OAuth, restricted to `@berkeley.edu`) |

### 7.2 Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List active bounty tickets. Supports query params: `?category=`, `?area=`, `?min_bounty=`, `?max_bounty=`, `?sort=` (newest, highest_bounty, closest), `?page=`, `?limit=` |
| GET | `/api/tickets/:id` | Get single ticket details |
| POST | `/api/tickets` | Create a new bounty ticket. Body: `{ description, category, generalArea, lostAt, bountyAmountCents, referencePhoto? }`. Auto-attaches `filed_at` timestamp and `owner_id` from session. Returns Stripe `clientSecret` for escrow payment. |
| PATCH | `/api/tickets/:id` | Update ticket — owner only, only while status is `active`. Can extend expiry or increase bounty. |
| POST | `/api/tickets/:id/cancel` | Cancel ticket and refund escrow — owner only, only while status is `active` (no approved claims). |
| POST | `/api/tickets/:id/confirm-receipt` | Owner confirms they received the item. Triggers payout. Only when status is `found` with an approved claim. |

### 7.3 Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets/:id/claims` | Submit a bounty claim with proof. Body: `{ proofPhotos[], foundLocation, foundLocationLat?, foundLocationLng?, finderNote? }`. |
| GET | `/api/tickets/:id/claims` | List claims for a ticket — owner only. Returns all claims with proof. |
| GET | `/api/claims/:id` | Get single claim details — finder or ticket owner only. |
| POST | `/api/claims/:id/approve` | Owner approves a claim. Creates a messaging thread. Changes ticket status to `found`. |
| POST | `/api/claims/:id/reject` | Owner rejects a claim. Ticket stays active. |

### 7.4 Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/threads` | List user's message threads (as owner or finder) |
| GET | `/api/threads/:id/messages` | Get messages in a thread — participants only. Supports pagination. |
| POST | `/api/threads/:id/messages` | Send a message. Body: `{ body }`. Participants only. |

### 7.5 Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler for payment events |
| POST | `/api/users/me/stripe-connect` | Initiate Stripe Connect onboarding for finder payouts |
| GET | `/api/users/me/earnings` | Get finder's earnings history |
| GET | `/api/users/me/payments` | Get owner's payment history (bounties paid) |

### 7.6 Ratings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/claims/:id/ratings` | Leave a rating after a completed claim. Body: `{ score, comment? }`. |
| GET | `/api/users/:id/ratings` | Get a user's received ratings (public) |

### 7.7 Disputes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/claims/:id/disputes` | Open a dispute. Body: `{ reason }` |
| GET | `/api/admin/disputes` | Admin only: list all open disputes |
| PATCH | `/api/admin/disputes/:id` | Admin only: resolve a dispute |

### 7.8 Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/notifications` | List user's notifications |
| PATCH | `/api/users/me/notifications/:id` | Mark notification as read |

---

## 8. Verification & Proof System

Unlike AI-based verification, Lost-N-Found uses **human verification by the owner**. The owner is the only person who truly knows what their item looks like, so they are the best judge.

### 8.1 Proof Submission (Finder Side)

When a finder claims a bounty, they must provide:

1. **Photos of the found item** (1–5 photos, required) — clear, well-lit photos showing the item from multiple angles.
2. **Location where it was found** (required) — pin on campus map or typed address. This helps the owner assess plausibility ("I lost it near Dwinelle, and they found it near Dwinelle — makes sense").
3. **Optional note** — any additional context ("Found it wedged between two seats in the lecture hall").

### 8.2 Owner Review

The owner reviews the proof and decides:

- **Approve:** "Yes, that's my item." → Messaging opens, handoff begins.
- **Reject:** "No, that's not it." → Claim is rejected, ticket stays active.

The owner can take as long as they need to review, but:
- If the owner doesn't respond within **72 hours**, the finder can escalate to a dispute.
- Finders receive a "pending review" status and are notified when the owner responds.

### 8.3 Multiple Claims

- Multiple finders can claim the same ticket simultaneously.
- The owner sees all pending claims and can approve whichever one is correct.
- Once one claim is approved, all other pending claims for that ticket are auto-rejected.
- Rejected finders are notified: "The owner approved a different claim. Thanks for looking!"

### 8.4 Anti-Fraud Safeguards

- **Photo metadata stripping:** EXIF data is stripped from uploaded photos to prevent location/identity leaks, but the finder's self-reported location is kept.
- **Rate limiting:** A finder can submit max 10 claims per day (prevents spam).
- **Duplicate claims:** A finder cannot submit multiple claims for the same ticket.
- **Fake proof detection:** If an owner flags a claim as fraudulent (e.g., stolen stock photo), admin can review and ban the user.
- **Owner collusion prevention:** If patterns suggest an owner is creating fake tickets to farm bounties to a friend, admin can investigate and ban both accounts.

---

## 9. Messaging System

Messaging opens only after an owner approves a claim. This prevents spam and ensures both parties are committed to the handoff.

### 9.1 Thread Lifecycle

```
Claim approved
      │
      ▼
Thread created (status: active)
      │
      ▼
Owner and finder exchange messages to coordinate meetup
      │
      ▼
Owner confirms receipt → thread status: closed
```

### 9.2 Implementation

- **Real-time:** Supabase Realtime subscriptions for instant message delivery.
- **Storage:** Messages stored in `messages` table, organized by `message_threads`.
- **Access control:** Only the two participants (owner + finder) can read/write in a thread. Admin can read threads during dispute resolution.

### 9.3 Message Features

- Text messages (no file/image sharing in v1 — photos were already exchanged in the proof step)
- Read receipts (is_read flag)
- Unread message count badge in the UI
- Push notification on new message (in-app + email fallback)

### 9.4 Safety Guidelines

- Messages are logged and reviewable by admin in case of disputes.
- A "Report" button on the messaging screen lets either party flag inappropriate messages.
- No sharing of personal contact info is required — the app handles all communication.
- Standard content moderation: block messages containing phone numbers, social media handles, or links (encourage keeping communication on-platform for safety and dispute resolution).

---

## 10. Payment System

### 10.1 Payment Flow

```
Owner files bounty ticket
        │
        ▼
Stripe PaymentIntent created (amount = bounty)
        │
        ▼
Owner completes payment on frontend (Stripe Elements)
        │
        ▼
Bounty held in escrow (capture_method: 'manual')
        │
        ▼
Ticket goes live on the platform
        │
        ├──── Ticket expires / owner cancels ────→ Full refund to owner
        │
        ▼
Finder submits claim → Owner approves → Meetup via messaging
        │
        ▼
Owner taps "I Got My Item" (confirms receipt)
        │
        ▼
Escrow captured and split:
  85% → Finder (Stripe Connect transfer)
  15% → Platform (application_fee_amount)
```

### 10.2 Fee Examples

| Bounty | Finder Payout (85%) | Platform Fee (15%) |
|--------|---------------------|-------------------|
| $2.00 (minimum) | $1.70 | $0.30 |
| $5.00 | $4.25 | $0.75 |
| $10.00 | $8.50 | $1.50 |
| $20.00 | $17.00 | $3.00 |
| $50.00 | $42.50 | $7.50 |

### 10.3 Stripe Integration Details

- **Escrow:** Stripe PaymentIntents with `capture_method: 'manual'`. The bounty is authorized when the ticket is filed but only captured when the owner confirms receipt. Stripe allows up to 7 days for manual capture; for longer-lived tickets, we use a `setup_intent` + saved payment method and charge at capture time.
- **Long-lived escrow (>7 days):** Since tickets can last up to 30 days, we cannot hold an uncaptured PaymentIntent that long. Instead:
  1. On ticket creation: create a `SetupIntent` to save the owner's payment method.
  2. Immediately create and capture a PaymentIntent for the full bounty amount, depositing it into the platform's Stripe balance.
  3. On payout: transfer 85% to the finder's connected account.
  4. On refund (expiry/cancellation): refund the original charge to the owner.
- **Finder payouts:** Stripe Connect Express accounts. Finders onboard via Stripe Connect OAuth before their first payout.
- **Platform fee:** Collected as `application_fee_amount` on the transfer to the finder's connected account.
- **Refunds:** Full refund to owner if ticket expires or is cancelled before a claim is approved.
- **Webhook events to handle:**
  - `payment_intent.succeeded` — mark ticket as `active` (bounty secured)
  - `payment_intent.payment_failed` — notify owner, ticket not posted
  - `transfer.created` — log payout to finder
  - `charge.refunded` — log refund to owner

### 10.4 Bounty Increases

- Owners can increase their bounty at any time while the ticket is active (to attract more searchers).
- The additional amount is charged immediately.
- Bounties cannot be decreased.

---

## 11. Privacy & Information Disclosure

### 11.1 What is Public (Shown to Everyone)

- Ticket description (what the item looks like)
- Category
- General area where item was lost
- Date/time lost
- Bounty amount
- Reference photo (if owner provided one)
- Ticket status (active / found / resolved)

### 11.2 What is Shown to the Ticket Owner

Everything public, plus:
- All claims on their ticket (proof photos, finder's found location, finder's note)
- Finder's display name and rating (after claim is submitted)
- Messaging thread (after approving a claim)

### 11.3 What is Shown to the Finder

- Ticket's public information (same as everyone)
- Their own claim status (pending / approved / rejected)
- Owner's display name and rating (after their claim is approved)
- Messaging thread (after claim is approved)

### 11.4 What is Admin-Only

- Full message history for any thread (for dispute resolution)
- Transaction details and Stripe references
- User email addresses
- Dispute logs and resolution history

---

## 12. Frontend Pages & Components

### 12.1 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home / Bounty Board | Scrollable feed of active bounty tickets. Search bar, category filters, area filter, bounty range filter, sort options. |
| `/login` | Login | Google OAuth sign-in (restricted to `@berkeley.edu`) |
| `/tickets/new` | File a Ticket | Form for owners to file a bounty ticket + payment |
| `/tickets/:id` | Ticket Detail | Full ticket info + "Claim Bounty" button (or list of claims if you're the owner) |
| `/tickets/:id/claim` | Submit Proof | Finder submits proof photos + location |
| `/tickets/:id/claims` | Review Claims | Owner reviews all claims, approves/rejects (owner only) |
| `/messages` | Messages | List of all message threads for the user |
| `/messages/:threadId` | Chat | Individual messaging thread between owner and finder |
| `/dashboard` | My Dashboard | Tabs: "My Tickets" (items I lost), "My Claims" (bounties I've claimed), "Earnings" |
| `/dashboard/earnings` | Earnings | Payout history, Stripe Connect onboarding |
| `/settings` | Settings | Profile, notification preferences |
| `/admin` | Admin Panel | Dispute management, user management, transaction overview (admin only) |

### 12.2 Key Components

- **TicketCard** — Card displaying bounty ticket info (used in feed and search results). Shows category icon, description preview, bounty amount badge, area, and time since posted.
- **TicketForm** — Multi-step form for filing a bounty ticket (description, category, area, date, bounty amount, optional reference photo, payment).
- **ProofSubmissionForm** — Form for finders to upload proof photos, pin location on map, and add an optional note.
- **ClaimReviewCard** — Card for owners to review a claim's proof (photos carousel, location on map, finder note, approve/reject buttons).
- **ChatWindow** — Real-time messaging component with message bubbles, timestamps, read receipts, and a "I Got My Item" confirmation button for the owner.
- **CampusMap** — Interactive map component (Mapbox GL JS, scoped to Berkeley campus) used for both "where did you lose it" and "where did you find it."
- **BountyBadge** — Displays bounty amount with color coding ($2–$5 green, $5–$15 yellow, $15+ gold).
- **PaymentForm** — Stripe Elements integration for bounty escrow payment.
- **EarningsTable** — Table of finder's payout history.
- **RatingStars** — Star rating component for post-handoff ratings.
- **NotificationBell** — Header notification indicator + dropdown.

### 12.3 Design Principles

**Philosophy:** The app should feel **simple, clean, and unmistakably Berkeley**. A student should be able to glance at any screen and know exactly what to do next without reading instructions. No visual clutter, no unnecessary animations, no dark patterns. Think "campus bulletin board meets clean mobile app."

**Core principles:**

- **Mobile-first** — students will use this on their phones while walking around campus. Desktop is secondary.
- **Scavenger-hunt feel** — bounty board with prominent bounty amounts, large category icons, subtle gamification (but never gimmicky).
- **Minimal clicks** — file a ticket in under 2 minutes including payment; claim a bounty in under 1 minute (snap photos, pin location, submit).
- **Clear status feedback** — every ticket and claim shows its status prominently with consistent color coding.
- **Low cognitive load** — one primary action per screen. If a screen has more than two equally-weighted buttons, it needs redesigning.

### 12.4 Visual Design System

#### Color Palette (Cal-themed)

**Primary colors (official Berkeley):**

| Name | Hex | Usage |
|------|-----|-------|
| **Berkeley Blue** | `#003262` | Primary brand color. Header background, primary buttons, links, key UI accents. |
| **California Gold** | `#FDB515` | Secondary brand color. Bounty amount badges, call-to-action highlights, active state indicators. |

**Neutral grays (for text, backgrounds, borders):**

| Name | Hex | Usage |
|------|-----|-------|
| **Ink** | `#1A1A1A` | Primary text (headings, body) |
| **Slate** | `#4A5568` | Secondary text (subtitles, metadata) |
| **Fog** | `#A0AEC0` | Tertiary text (timestamps, helper text) |
| **Mist** | `#E2E8F0` | Borders, dividers |
| **Snow** | `#F7FAFC` | Page background |
| **White** | `#FFFFFF` | Card backgrounds, modal backgrounds |

**Semantic colors (status + feedback):**

| Name | Hex | Usage |
|------|-----|-------|
| **Success Green** | `#10B981` | Approved claims, "Resolved" status, success toasts |
| **Warning Amber** | `#F59E0B` | Pending review, expiring soon warnings |
| **Error Red** | `#EF4444` | Rejected claims, disputes, error toasts |
| **Info Blue** | `#3B82F6` | Neutral informational states, "new" badges |

**Status color mapping:**

| Status | Color |
|--------|-------|
| `active` (ticket) | Berkeley Blue |
| `found` (ticket) | Warning Amber |
| `resolved` (ticket) | Success Green |
| `expired` / `cancelled` | Fog (grayed out) |
| `disputed` | Error Red |
| `pending_review` (claim) | Warning Amber |
| `approved` (claim) | Success Green |
| `rejected` (claim) | Error Red |

**Bounty badge color tiers (reinforces the scavenger-hunt feel):**

| Bounty Range | Badge Color |
|--------------|-------------|
| $2–$5 | Success Green |
| $5.01–$15 | Warning Amber |
| $15.01+ | California Gold (with subtle glowing border) |

#### Typography

- **Font family:** Inter (Google Fonts) — clean, highly legible, zero personality, perfect for utilitarian apps.
- **Headings:** Inter Semibold (600), tight line height (1.2)
- **Body:** Inter Regular (400), relaxed line height (1.5)
- **Buttons/labels:** Inter Medium (500), sentence case (never ALL CAPS)
- **Bounty amounts:** Inter Bold (700), larger size (28–36px on cards) — these are the hero element
- **Scale (mobile → desktop):**
  - H1: 24px → 32px
  - H2: 20px → 24px
  - H3: 16px → 18px
  - Body: 15px → 16px
  - Small: 13px → 14px

#### Spacing & Layout

- **Base unit:** 4px. All spacing is a multiple of 4 (4, 8, 12, 16, 24, 32, 48, 64).
- **Card padding:** 16px on mobile, 24px on desktop.
- **Page gutters:** 16px on mobile, 32px on desktop. Max content width 640px on phones, 1120px on desktop.
- **Vertical rhythm:** 16px between related elements, 32px between sections.

#### Component Styling

- **Borders:** 1px Mist (`#E2E8F0`) for all cards, inputs, and dividers. Never use box-shadows as dividers.
- **Corner radius:** 8px for cards and buttons, 12px for modals, 4px for inputs and badges. Never sharp corners.
- **Elevation:** Avoid heavy drop shadows. Use a single subtle shadow (`0 1px 3px rgba(0,0,0,0.06)`) only on floating elements (modals, dropdowns). Cards on the bounty board are flat (border only).
- **Buttons:**
  - **Primary:** Berkeley Blue background, white text, hover darkens to `#002347`
  - **Secondary:** White background, Berkeley Blue border + text, hover fills to `#F0F4F8`
  - **Destructive:** Error Red background, white text
  - **Ghost:** Transparent, Slate text, for tertiary actions
  - Never more than one primary button visible on a screen
- **Inputs:** White background, Mist border, Berkeley Blue border + subtle blue glow on focus. Labels always above the input (never floating or placeholders-only).
- **Icons:** Lucide React. Stroke width 1.5. Same size as adjacent text. Never decorative — every icon must reinforce meaning.

#### Illustrations & Imagery

- **No stock photos, no illustrations, no mascots.** The UI is content-first. The only images shown are user-uploaded (proof photos, reference photos) and user avatars.
- **Category icons:** Single-line Lucide icons only (e.g., `Droplet` for water bottles, `Smartphone` for phones, `Key` for keys). No colored emoji.
- **Empty states:** A single centered icon (Fog-colored) + one line of text + one primary button. No illustrations.

#### Interaction & Animation

- **Transitions:** 150ms ease-out on hover/focus states. No bouncy or decorative animations.
- **Loading:** Simple skeleton loaders matching the shape of the content being loaded. No spinners on full-page loads.
- **Feedback:** Toast notifications (top of screen, auto-dismiss after 3s) for all submit actions. Success = green, error = red, info = blue.
- **Destructive actions on mobile:** Use bottom sheets, not centered modals (thumb-friendly).

#### Simplicity Rules (hard constraints)

1. **Max two font weights per screen** (e.g., Regular + Semibold).
2. **Max three colors per screen** beyond neutrals (e.g., Berkeley Blue + California Gold + one status color).
3. **No gradients.** Solid fills only.
4. **No icons inside buttons unless the icon is essential** (e.g., "+" on "Post Item"). Text-only buttons by default.
5. **Bottom tab bar on mobile** (Home, Post, Messages, Dashboard), persistent top header on desktop. Never both.
6. **No onboarding tour.** The UI should be self-explanatory. If a feature needs explaining, it needs redesigning.

#### Accessibility

- All interactive elements meet WCAG AA contrast ratios (Berkeley Blue on white = 11.5:1, passes).
- Focus states are always visible (2px Berkeley Blue outline).
- All form fields have associated labels. All buttons have accessible names.
- Tap targets are minimum 44×44px on mobile.
- Supports system dark mode via `prefers-color-scheme` (inverts neutrals, keeps Berkeley Blue and California Gold accents).

---

## 13. Authentication & Authorization

### 13.1 Authentication

- **Provider:** Google OAuth via NextAuth.js
- **Restriction:** Only `@berkeley.edu` email addresses can sign up/log in
- **Session:** JWT-based sessions (stateless, no session table needed)
- **Persistence:** Secure HTTP-only cookies

### 13.2 Authorization Rules

| Action | Who Can Do It |
|--------|---------------|
| Browse bounty tickets | Any authenticated user |
| File a bounty ticket | Any authenticated user |
| Claim a bounty | Any authenticated user (except the owner of that ticket) |
| Edit/cancel a ticket | Only the ticket owner (while status is `active`) |
| Review claims on a ticket | Only the ticket owner |
| Approve/reject a claim | Only the ticket owner |
| Send messages in a thread | Only the two thread participants |
| Confirm receipt | Only the ticket owner (after approving a claim) |
| Open a dispute | Owner or finder of the specific claim |
| Admin panel access | Admin user only (hardcoded admin email list) |

### 13.3 Row-Level Security (Supabase RLS)

- `claims.proof_photo_urls`, `claims.found_location`, `claims.finder_note`: accessible to the claim's finder OR the ticket's owner.
- `messages`: only accessible to the two participants of the thread, or admin.
- `message_threads`: only accessible to the thread's owner and finder.
- `disputes`: only accessible to the involved parties and admin.
- `transactions`: only accessible to the involved user and admin.

---

## 14. Notifications

### 14.1 Notification Events

| Event | Recipient | Channel |
|-------|-----------|---------|
| New bounty claim on your ticket | Owner | In-app + email |
| Your claim was approved — start chatting! | Finder | In-app + email |
| Your claim was rejected | Finder | In-app + email |
| New message received | Recipient | In-app + email (if not read within 5 min) |
| Owner confirmed receipt — payout incoming! | Finder | In-app + email |
| Payout sent | Finder | In-app + email |
| Ticket expiring in 3 days | Owner | In-app + email |
| No response from owner for 48h on your claim | Finder | In-app (with option to escalate) |
| Dispute opened | Both parties | In-app + email |
| Dispute resolved | Both parties | In-app + email |
| New rating received | Rated user | In-app |

### 14.2 Implementation

- **In-app:** Stored in a `notifications` table, fetched on page load. Real-time push via Supabase Realtime subscriptions.
- **Email:** Sent via Resend API with transactional templates. Throttled to avoid spam (e.g., batch message notifications into a 5-minute digest).

---

## 15. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack React, server components, API routes, good DX |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI development, consistent design system |
| Database | PostgreSQL (Supabase) | Managed Postgres, built-in RLS, Realtime, storage |
| ORM | Prisma | Type-safe database access, migrations, schema management |
| Auth | NextAuth.js v5 | Google OAuth with email restriction, JWT sessions |
| Payments | Stripe (PaymentIntents + Connect) | Escrow via manual capture, marketplace payouts via Connect |
| Real-time | Supabase Realtime | WebSocket-based subscriptions for messaging and notifications |
| File Storage | Supabase Storage | Photo uploads with signed URLs for private access |
| Email | Resend | Transactional email API, good DX |
| Maps | Mapbox GL JS | Campus map for location pinning (lost area + found location) |
| Hosting | Vercel | Native Next.js hosting, edge functions, easy deploys |
| Monitoring | Vercel Analytics + Sentry | Performance monitoring and error tracking |

**Note:** The Claude API is no longer needed in v2. Verification is handled manually by the owner, not by AI. This simplifies the stack and reduces per-transaction costs.
---

## 16. Infrastructure & Deployment

### 16.1 Environments

| Environment | Purpose | Database |
|-------------|---------|----------|
| `development` | Local development | Local Supabase (Docker) or Supabase dev project |
| `preview` | PR preview deploys (Vercel) | Shared staging Supabase project |
| `production` | Live app | Production Supabase project |

### 16.2 Environment Variables

```
# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Admin
ADMIN_EMAILS=ssundaram@berkeley.edu
```

### 16.3 CI/CD

- **Vercel Git Integration:** Auto-deploy on push to `main` (production) and on PR creation (preview)
- **Pre-deploy checks:** TypeScript type check, ESLint, Prisma schema validation
- **Database migrations:** Run via `prisma migrate deploy` in Vercel build step

---

## 17. Security Considerations

### 17.1 Data Protection

- Proof photos are stored in Supabase Storage with signed URLs (short expiry, 1 hour).
- RLS policies enforce that only the owner of a ticket can see claims on it, and only thread participants can see messages.
- API routes validate authorization before returning any data.
- EXIF data is stripped from all uploaded photos server-side.

### 17.2 Payment Security

- No credit card data touches our servers — Stripe Elements handles PCI compliance.
- Stripe webhook signatures are verified on every webhook event.
- Escrow captures are only triggered server-side after the owner confirms receipt.

### 17.3 Anti-Fraud

- Only `@berkeley.edu` emails (limits to real Berkeley students).
- One active claim per finder per ticket.
- Rate limiting: max 10 claims per finder per day, max 5 tickets per owner per day.
- Banned users cannot file tickets or submit claims.
- Owner collusion detection: flag accounts that repeatedly create tickets that the same finder always claims.
- Content moderation on message threads: block personal contact info to keep interactions on-platform.

### 17.4 Messaging Safety

- Messages are stored and reviewable by admin during disputes.
- Report button available on every message thread.
- Auto-filter for phone numbers, social handles, and external links (with a gentle nudge: "For your safety, please keep all communication on Lost-N-Found").

### 17.5 Privacy

- Owner and finder identities are only revealed to each other after a claim is approved (not to the general public).
- Proof photos are only visible to the ticket owner and the finder who submitted them.
- Items auto-expire after 30 days; expired ticket data is deleted after 90 days.

---

## 18. Edge Cases & Failure Modes

| Scenario | Handling |
|----------|----------|
| Multiple finders claim the same bounty | Owner sees all claims and picks the correct one. Approving one auto-rejects the rest. |
| Owner never reviews claims | After 72 hours of inactivity, the finder can escalate to a dispute. Admin nudges the owner or cancels the ticket with a refund. |
| Owner approves a claim but never confirms receipt (stalls payment) | After 7 days with no confirmation and no dispute, finder can escalate. Admin can force-release the payment. |
| Finder submits fake proof (stock photo, wrong item) | Owner rejects the claim. If the finder is persistently fraudulent, owner or admin can ban them. |
| Owner creates a ticket for an item they never actually lost (trying to scam) | Finder submits proof → owner never approves or dispute arises. Admin investigates and bans if fraudulent. |
| Owner and finder can't agree on a meetup | They continue messaging. If it stalls for 7+ days, either can escalate. Admin mediates or cancels with appropriate refund. |
| Finder doesn't have Stripe Connect set up when payout is triggered | Payout is queued. Finder is prompted to complete Stripe Connect onboarding. Payout releases once onboarding completes. |
| Same person is owner and finder | Server-side check: `finder_id !== owner_id`. Blocked at claim submission. |
| Owner wants to cancel ticket after a claim is approved | Not allowed — the claim is in progress. Owner must either complete the handoff or open a dispute. |
| Finder found the item but it's damaged | Owner can still approve and complete the handoff. If the damage was caused by the finder, they can dispute. Bounty amount doesn't change based on condition. |
| Stripe payment fails during ticket creation | Ticket is not posted. Owner sees an error and can retry payment. |
| Owner wants to increase bounty | Allowed at any time while ticket is `active`. Additional charge is processed immediately. |
| Item was already returned by someone outside the app | Owner cancels the ticket. Full escrow refund. If a claim was already approved, owner should dispute and explain. |

---

## 19. Future Enhancements

These are explicitly out of scope for v1 but worth noting for future iterations:

- **Push notifications:** Mobile push via PWA or native app wrapper
- **Leaderboard:** Top finders by bounties earned, items returned — gamification
- **Multi-campus expansion:** Extend beyond Berkeley to other UC campuses
- **Designated handoff locations:** Safe meetup spots endorsed by campus (e.g., library desks, campus police lobby)
- **Photo AI matching:** Use vision models to auto-suggest matching bounties when a finder uploads a photo
- **Bounty boost alerts:** Notify finders who are near the general area of a high-bounty ticket
- **Campus organization partnerships:** Lost-and-found desks at libraries, gyms as intermediaries
- **Batch payouts:** Weekly payout aggregation to reduce Stripe fees
- **Item categories with smart defaults:** Auto-suggest bounty amounts based on historical data
- **Reputation system v2:** Trust tiers that unlock higher bounty limits or priority placement

---

## 20. Milestones & Implementation Order

### Phase 1 — Foundation (Week 1–2)

- [ ] Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- [ ] Set up Supabase project (database, storage, RLS policies)
- [ ] Define Prisma schema and run initial migration
- [ ] Implement Google OAuth with `@berkeley.edu` restriction
- [ ] Build basic layout: header, navigation, mobile-responsive shell

### Phase 2 — Bounty Tickets (Week 3–4)

- [ ] Build "File a Ticket" form (description, category, area, date, bounty, optional reference photo)
- [ ] Implement campus map component for location selection
- [ ] Integrate Stripe PaymentIntent for bounty escrow on ticket creation
- [ ] Build bounty board (public feed) with search, filters, and sorting
- [ ] Build ticket detail page
- [ ] Implement ticket expiry and cancellation logic

### Phase 3 — Claims & Proof (Week 5–6)

- [ ] Build "Claim Bounty" proof submission form (photos, location pin, note)
- [ ] Build owner's claim review interface (photo carousel, map view, approve/reject)
- [ ] Implement multiple-claim handling (approve one, auto-reject others)
- [ ] Implement claim status lifecycle and notifications

### Phase 4 — Messaging (Week 7)

- [ ] Set up Supabase Realtime for messaging
- [ ] Build message thread list page
- [ ] Build chat UI (message bubbles, timestamps, read receipts)
- [ ] Implement "I Got My Item" confirmation button in chat
- [ ] Add content filtering for safety (phone numbers, links)

### Phase 5 — Payments & Payouts (Week 8)

- [ ] Implement Stripe Connect onboarding flow for finders
- [ ] Build payout logic (85/15 split on owner confirmation)
- [ ] Handle Stripe webhooks for all payment events
- [ ] Build earnings dashboard for finders
- [ ] Build payment history for owners
- [ ] Implement refund flow for expired/cancelled tickets

### Phase 6 — Notifications, Ratings & Polish (Week 9)

- [ ] Implement notification system (in-app + email via Resend)
- [ ] Build notification UI (bell icon, dropdown)
- [ ] Build user dashboard (my tickets, my claims, earnings)
- [ ] Implement post-handoff rating system
- [ ] Add dispute flow (open, admin review, resolve)
- [ ] Build admin panel for dispute management and user moderation

### Phase 7 — Hardening & Launch (Week 10–11)

- [ ] Security audit (RLS policies, API auth, rate limiting, content filtering)
- [ ] Error handling and edge case testing
- [ ] Performance optimization (image compression, lazy loading, Realtime connection management)
- [ ] Set up Sentry for error monitoring
- [ ] Beta testing with a small group of Berkeley students
- [ ] Production deploy and soft launch

---

*End of Technical Design Document*
