import { Metadata } from "next";

import { BrandsView } from "@/domains/admin/components/brand/brandsView";

export const metadata: Metadata = { title: "Brands" };

const AdminBrands = () => <BrandsView />;

export default AdminBrands;
