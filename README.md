<p align="center">
  <img src="public/images/logo.webp" alt="Cartwise" width="360" />
</p>

<p align="center">
  A full-stack e-commerce store and admin dashboard built with Next.js 14, React, TypeScript, Tailwind CSS, Prisma, MongoDB, NextAuth and Redux.
</p>

---

## Overview

**Cartwise** is a full-stack e-commerce web application with a customer-facing storefront and an admin dashboard for managing the catalog.

⚠️ `Note:` This project is a personal endeavor created for portfolio purposes and is not associated with any real business.

## 🧰 Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Framework  | Next.js 14 (App Router), React 18       |
| Language   | TypeScript                              |
| Styling    | Tailwind CSS                            |
| State      | Redux Toolkit                           |
| Database   | MongoDB (Atlas) with Prisma ORM         |
| Auth       | NextAuth                                |
| Validation | Zod                                     |
| Images     | Cloudinary                              |

---

### 🖥️ Admin Dashboard Features

#### 🔐 Authentication

- Credential authentication for the dashboard using NextAuth.

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

- Customer sign up and sign in.
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

- MongoDB access through Prisma ORM.
- Database hosted on MongoDB Atlas.
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
DATABASE_URL=       # MongoDB connection string
NEXTAUTH_SECRET=    # Secret used to sign NextAuth sessions
CLOUDINARY_URL=     # Hosting address for product images
```

### ⬆️ Set up Prisma

```shell
npx prisma db push
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

## 👤 Author

**Christian** — [@christianavila703](https://github.com/christianavila703)
