import { Metadata } from "next";

import { CategoriesView } from "@/domains/admin/components/category/categoriesView";

export const metadata: Metadata = { title: "Categories" };

const AdminCategories = () => <CategoriesView />;

export default AdminCategories;
