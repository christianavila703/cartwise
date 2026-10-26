# Cartwise — Roadmap

Steps to turn Cartwise into a complete, polished store, ordered by impact.
Each item lists the commit message to use when it's done.

**Suggested order:** 1 → 2 → 4 (a working shop) · 3 + 5 (findable) · 6–12 (nothing looks fake) · 18–20 (SEO quick wins) · 23–25 (ship with confidence)

---

## 🔴 Must-have: what makes it a real store

- [✓] **1. Checkout and orders**
  Cart → shipping address → payment (Stripe test mode) → order confirmation. Add `Order` and `OrderItem` models.
  _Why:_ the cart has no checkout today, so nothing can be bought.
  `feat: add checkout and order placement with stripe`

- [✓] **2. Order management**
  Admin order list with status (paid → shipped → delivered), a "My orders" page for customers, revenue on the dashboard.
  _Why:_ without orders the dashboard can't show sales.
  `feat: add order management to admin and customer account`

- [ ] **3. Working search**
  The navbar search box has no logic. Add a search results page with suggestions while typing.
  _Why:_ search is the main way people find products.
  `feat: add product search with suggestions`

- [ ] **4. Stock quantity**
  Track real quantities instead of only in/out of stock, decrease on order, show "low stock" in the admin.
  _Why:_ prevents selling the same last item twice.
  `feat: track product stock quantity`

- [ ] **5. Server-rendered storefront**
  Home, list and product pages fetch data in the browser, so search engines see empty pages and users see loading flashes.
  `perf: render storefront pages on the server`

## 🟠 Polish: remove anything that looks fake

- [ ] **6. Real product reviews**
  Replace the hard-coded "T. Mihai" review, Lorem ipsum text and "880 User Reviews". Add a `Review` model with star ratings; only buyers can review.
  `feat: add product reviews and ratings`

- [ ] **7. Related products from the database**
  Show products from the same category instead of the fixed "Similar Products" list.
  `feat: show related products from the same category`

- [ ] **8. Homepage driven by data**
  Today's deals, top products, slider and collections are hard-coded with fixed IDs. Make them editable in the admin or derive them from sale prices and views.
  `feat: drive homepage sections from catalog data`

- [ ] **9. Real blog content**
  Replace the Lorem ipsum blog cards, or remove the section.
  `chore: replace placeholder blog content`

- [ ] **10. Info pages and footer links**
  Fix the empty footer links and placeholder social links. Add About, Contact, Shipping, Returns and Privacy pages.
  `feat: add info pages and fix footer links`

- [ ] **11. Product options for customers**
  Options (color, storage) exist in the admin but can't be chosen on the product page. Let customers pick them and carry them into the cart.
  `feat: let customers choose product options`

- [ ] **12. Storefront refresh**
  Bring the store in line with the new admin: brand colors, new logo, consistent spacing across navbar, cards, product page and cart.
  `style: refresh storefront design`

## 🟡 Accounts and trust

- [ ] **13. Account page** — profile, change password, saved addresses.
  `feat: add customer account page`

- [ ] **14. Password reset and email verification** — emails via a provider such as Resend.
  `feat: add password reset and email verification`

- [ ] **15. Sync cart and favorites to the account** — today they live only in the browser and are lost on another device.
  `feat: sync cart and favorites with user account`

- [ ] **16. Google sign-in** (optional).
  `feat: add google sign in`

- [ ] **17. Rate-limit sign in and sign up** — protects against password guessing.
  `fix: rate limit authentication endpoints`

## 🟢 SEO, quality and launch

- [ ] **18. Favicon and share images** — the favicon currently returns 404.
  `chore: add favicon and social share images`

- [ ] **19. SEO basics** — per-product title, description and image; `sitemap.xml`; `robots.txt`; structured product data.
  `feat: add product metadata, sitemap and robots`

- [ ] **20. 404, error and loading pages** — branded instead of the defaults.
  `feat: add not found, error and loading pages`

- [ ] **21. Accessibility pass** — keyboard navigation, focus styles, alt text, color contrast.
  `fix: improve storefront accessibility`

- [ ] **22. Mobile pass** — test and fix phone-size layouts for store and admin.
  `fix: improve mobile layouts`

- [ ] **23. Tests** — unit tests for server actions; Playwright end-to-end tests for buying, sign in and admin actions.
  `test: add unit and end-to-end tests`

- [ ] **24. Continuous integration** — lint, type check, tests and build on every push with GitHub Actions.
  `ci: add lint, test and build workflow`

- [ ] **25. Production deployment** — deploy to Vercel using the Supabase transaction pooler (`connection_limit=1`), and add analytics.
  `chore: configure production deployment`

- [ ] **26. Upgrade Prisma** — move to Prisma 8 once it's stable.
  `chore: upgrade prisma`
