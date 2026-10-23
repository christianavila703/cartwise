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

---

### 🖥️ Admin Dashboard Features

#### 🔐 Authentication and Roles

- Email and password authentication with NextAuth.
- Role-based access: only users with the `ADMIN` role can open the dashboard.
- Every admin server action re-checks the role against the database, so the dashboard API can't be called directly by other users.

#### 📁 Category Management

- Advanced category management, including combining categories.
- Add, update, and delete categories and subcategories.
- Dedicated **specifications** for every category.

#### 🏭 Brands and Products

- Add and delete products with category-specific specifications.
- Add, update, and delete brands.

#### 📋 Traffic Report

- Reports on user page visits with pagination.

---

### 🛍️ Storefront Features

#### 👤 Accounts

- Customer sign up, sign in and sign out.
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
DATABASE_URL=       # PostgreSQL connection used by the app (Supabase transaction pooler, port 6543)
DIRECT_URL=         # PostgreSQL connection used by migrations (Supabase session pooler, port 5432)
NEXTAUTH_SECRET=    # Secret used to sign NextAuth sessions
NEXTAUTH_URL=       # Base URL of the app, e.g. http://localhost:3000
NEXT_PUBLIC_IMAGE_BASE_URL= # Public image base URL, e.g. https://res.cloudinary.com/<cloud>/image/upload (empty serves /public)
CLOUDINARY_URL=     # Cloudinary API credentials, server-only (used to upload images)
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
