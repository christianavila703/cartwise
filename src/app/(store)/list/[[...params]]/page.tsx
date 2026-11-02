import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getList } from "@/actions/list/listServices";
import { ListView } from "@/domains/store/productList/components/listView";
import { DEFAULT_FILTERS, SORT_DATA } from "@/domains/store/productList/constants";

type TProps = { params: Promise<{ params?: string[] }> };

// stock and prices change, so category pages are rendered per request
export const dynamic = "force-dynamic";

const titleFromSlug = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const generateMetadata = async ({ params }: TProps): Promise<Metadata> => {
  const segments = (await params).params ?? [];
  if (!segments.length) return {};
  const name = titleFromSlug(segments[segments.length - 1]);
  return {
    title: `${name} — Cartwise`,
    description: `Shop ${name.toLowerCase()} at Cartwise: compare prices, brands and availability.`,
  };
};

const ListPage = async ({ params }: TProps) => {
  const segments = (await params).params ?? [];
  if (!segments.length) redirect("/");

  // the first page of products is rendered on the server; sorting and filtering then happen in the browser
  const response = await getList("/list/" + segments.join("/"), SORT_DATA[0], DEFAULT_FILTERS);
  if (response.error || !response.products || !response.subCategories) notFound();

  return (
    <ListView
      // a new category path starts with fresh sort and filter state
      key={segments.join("/")}
      params={segments}
      initialProducts={response.products}
      initialSubCategories={response.subCategories}
    />
  );
};

export default ListPage;
