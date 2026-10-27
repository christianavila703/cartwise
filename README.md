<p align="center">
  <img src="public/images/logo.webp" alt="Cartwise" width="360" />
</p>

<p align="center">
  A full-stack e-commerce store and admin dashboard built with Next.js 16, React 19, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth and Redux.
</p>

---

## Overview

**Cartwise** is a full-stack e-commerce web application with a customer-facing storefront and an admin dashboard for managing the catalog.

⚠️ `Note:` This project is a personal endeavor created for portfolio purposes and is not associated with any real business.

## 🧰 Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19       |
| Language   | TypeScript                              |
| Styling    | Tailwind CSS                            |
| State      | Redux Toolkit                           |
| Database   | PostgreSQL (Supabase) with Prisma ORM   |
| Auth       | NextAuth                                |
| Validation | Zod                                     |
| Images     | Cloudinary                              |
| Payments   | Stripe Checkout                         |

---

### 🖥️ Admin Dashboard Features

#### 🔐 Authentication and Roles

- Email and password authentication with NextAuth.
- Role-based access: only users with the `ADMIN` role can open the dashboard.
- Every admin server action re-checks the role against the database, so the dashboard API can't be called directly by other users.

#### 📊 Dashboard

- Sales numbers: revenue, orders and average order value (with change vs the previous 30 days) and orders waiting to ship.
- 30-day revenue and traffic chart, visits by page type, recent orders and most viewed products.
- Catalog health checks (out of stock, missing images or descriptions) with quick actions.

#### 🧾 Orders

- Order list with revenue, refunds and orders waiting to ship, status tabs, search and date filters.
- Order details with a progress timeline, customer, shipping address and a link to the payment in Stripe.
- Mark orders as shipped (carrier and tracking number) and delivered, cancel unpaid orders and refund paid ones through Stripe, optionally putting the items back in stock.

#### 📦 Products

- Searchable, filterable and sortable product table with images, prices, discounts and inline stock editing.
- Stock tracking with low-stock and out-of-stock filters and dashboard warnings.
- Add and **edit** products in a side drawer: details, highlights, pricing with discount preview, category, brand and specifications.
- Image management: drag-and-drop upload straight to Cloudinary (server-signed), reorder, set the cover image or add an existing path.
- Server-side validation with clear error messages.

#### 📁 Categories

- Expandable category tree (groups, categories, sub categories) with product counts and search.
- Visual icon picker for groups and URL slugs generated from the name.
- Specification groups and options (text or color swatches) per category; sub categories inherit specifications.
- Deleting is blocked while a category still has sub categories or products.

#### 🏷️ Brands

- Brand cards with product counts, quick add, rename and safe delete (blocked while products use the brand).

#### 👥 Users

- Search and filter accounts, promote or demote admins and delete accounts. Admins can't demote or delete themselves.

#### 📈 Traffic

- Visit totals, 30-day chart, top pages, a filterable visit log with pagination, and clear-all.

---

### 🛍️ Storefront Features

#### 💳 Checkout and Payments

- Checkout with shipping details and a live order summary priced on the server.
- Secure payment with Stripe Checkout; free shipping over €100.
- Orders are stored with a snapshot of each product, and confirmed by the success page and a Stripe webhook.
- Stock is reserved when checkout starts (atomically, so the last unit can't be sold twice) and released when a checkout is cancelled or expires.
- "Only N left" on product pages, and quantities capped by what's in stock.

#### 👤 Accounts

- Customer sign up, sign in and sign out.
- "My orders" with order progress, parcel tracking links and order details.
- Account menu showing the signed-in user, with a dashboard link for admins.
- Favourite products.

#### 🎨 UI

- Fully responsive layout.
- CSS animations and effects.
- Skeleton loading (no external library) for seamless page navigation.
- Custom-built UI components (no external library):
  - Price range slider
  - Checkbox
  - Dropdown list
  - Popups
  - Button
- Interactive homepage slider, built from scratch, supporting both mouse drag and touch input.
- Shopping cart management with **Redux**.
- Product gallery to showcase items attractively.
- Categories loaded dynamically from the database.

#### 🔎 Search

- Search-as-you-type in the navbar with product images, prices, matching categories and recent searches, fully keyboard accessible.
- Multi-word matching across product names, brands, categories and descriptions, ranked by relevance.
- Typo tolerance ("Did you mean…?") using PostgreSQL trigram similarity (`pg_trgm`).
- Server-rendered results page with sorting and an in-stock filter.

#### 🔍 Filter and Sort

- Filter products by price, brand, and availability.
- Sort the product list by name and price.

#### ⚙️ Backend

- PostgreSQL access through Prisma ORM, with versioned migrations.
- Database hosted on Supabase.
- Seed script with a demo catalog and an admin user.
- Server-side form validation with Zod.

---

## 🚀 Getting Started

### 💾 Clone the repository

```shell
git clone https://github.com/christianavila703/cartwise.git
cd cartwise
```

### 📥 Install packages

```shell
npm install
```

### 🛠️ Set up the `.env` file

Copy `.env.example` to `.env` and fill in the values:

```shell
DATABASE_URL=       # PostgreSQL connection used by the app (Supabase session pooler 5432 locally, transaction pooler 6543 on Vercel)
DIRECT_URL=         # PostgreSQL connection used by migrations (Supabase session pooler, port 5432)
NEXTAUTH_SECRET=    # Secret used to sign NextAuth sessions
NEXTAUTH_URL=       # Base URL of the app, e.g. http://localhost:3000
NEXT_PUBLIC_IMAGE_BASE_URL= # Public image base URL, e.g. https://res.cloudinary.com/<cloud>/image/upload (empty serves /public)
CLOUDINARY_URL=     # Cloudinary API credentials, server-only (used to upload images)
STRIPE_SECRET_KEY=  # Stripe secret key (sk_test_… for test mode)
STRIPE_WEBHOOK_SECRET= # Signing secret of the /api/stripe/webhook endpoint
ADMIN_EMAIL=        # Admin account created by the seed script
ADMIN_PASSWORD=
```

### ⬆️ Set up the database

Create the tables, then load the demo catalog and admin user:

```shell
npm run db:migrate
npm run db:seed
```

> `npm run db:seed` replaces the catalog (categories, brands, specs and products) every time it runs. Users are kept.

### 🛡️ Admin access

The seed creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Sign in at `/login`, then open `/admin` (or use **Admin Dashboard** in the account menu).

To change a user's role:

```shell
npm run user:role -- someone@example.com ADMIN
npm run user:role -- someone@example.com USER
```

### 🖼️ Upload product images to Cloudinary

```shell
npm run images:upload
```

This uploads every image referenced by the products from `/public` to Cloudinary, keeping the same paths.

### 💳 Set up Stripe payments

1. Create a free account at [stripe.com](https://stripe.com) and copy the **test** secret key (`sk_test_…`) from [Developers → API keys](https://dashboard.stripe.com/test/apikeys) into `STRIPE_SECRET_KEY`.
2. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.
3. Optional locally, required in production: point a webhook at `/api/stripe/webhook` for the `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded` events, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. For local testing the [Stripe CLI](https://docs.stripe.com/stripe-cli) can forward events:

```shell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### ▶️ Start the app

```shell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start the development server             |
| `npm run build`    | Generate the Prisma client and build     |
| `npm run start`    | Start the production server              |
| `npm run lint`     | Run ESLint                               |
| `npm run lint:fix` | Run ESLint and fix problems              |
| `npm run db:migrate` | Apply database migrations              |
| `npm run db:seed`  | Reset the catalog and create the admin   |
| `npm run images:upload` | Upload product images to Cloudinary |
| `npm run user:role -- <email> <USER\|ADMIN>` | Change a user's role |

## 👤 Author

**Christian** — [@christianavila703](https://github.com/christianavila703)
