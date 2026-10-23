import { Metadata } from "next";
import { Suspense } from "react";

import { ProductsView } from "@/domains/admin/components/product/productsView";

export const metadata: Metadata = { title: "Products" };

const AdminProducts = () => (
  <Suspense>
    <ProductsView />
  </Suspense>
);

export default AdminProducts;
