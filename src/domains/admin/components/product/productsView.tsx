"use client";

import { ExternalLink, ImageOff, Package, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { deleteProduct, getAllProducts } from "@/actions/product/product";
import { LOW_STOCK_THRESHOLD } from "@/shared/constants/checkout";
import { TAdminProduct } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { discountPercent, formatNumber, formatPrice, productImageUrl, timeAgo } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { Card } from "../ui/card";
import { AdminSelect, SearchInput } from "../ui/field";
import { EmptyState, PageHeader, Skeleton } from "../ui/misc";
import { ConfirmDialog } from "../ui/overlay";
import { useToast } from "../ui/toast";

import { ProductEditor } from "./productEditor";
import { StockCell } from "./stockCell";

type TStockFilter = "all" | "inStock" | "lowStock" | "outOfStock" | "onSale";
type TSort = "newest" | "oldest" | "name" | "priceAsc" | "priceDesc";
type TEditorState = { mode: "new" } | { mode: "edit"; id: string } | null;

const sorters: Record<TSort, (a: TAdminProduct, b: TAdminProduct) => number> = {
  newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  name: (a, b) => a.name.localeCompare(b.name),
  priceAsc: (a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price),
  priceDesc: (a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price),
};

export const ProductsView = () => {
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // the drawer is driven by local state so it opens and closes instantly; the URL only mirrors it,
  // and is read once so links like /admin/products?edit=<id> open the editor directly
  const [editor, setEditor] = useState<TEditorState>(() => {
    const editParam = searchParams.get("edit");
    if (editParam) return { mode: "edit", id: editParam };
    return searchParams.get("new") === "1" ? { mode: "new" } : null;
  });

  const [products, setProducts] = useState<TAdminProduct[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  // ?stock=low|out comes from the dashboard's catalog health links
  const [stockFilter, setStockFilter] = useState<TStockFilter>(() => {
    const stock = searchParams.get("stock");
    return stock === "low" ? "lowStock" : stock === "out" ? "outOfStock" : "all";
  });
  const [groupFilter, setGroupFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sort, setSort] = useState<TSort>("newest");
  const [toDelete, setToDelete] = useState<TAdminProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const response = await getAllProducts();
      if (ignore) return;
      if (response.res) setProducts(response.res);
      else toast.error(response.error ?? "Can't load products");
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const reload = () => setReloadKey((key) => key + 1);
  const openEditor = (state: NonNullable<TEditorState>) => {
    setEditor(state);
    window.history.replaceState(null, "", `${pathname}?${state.mode === "edit" ? `edit=${state.id}` : "new=1"}`);
  };
  const closeEditor = () => {
    setEditor(null);
    window.history.replaceState(null, "", pathname);
  };

  const groups = useMemo(
    () => [...new Set((products ?? []).map((product) => product.categoryPath.split(" / ")[0]))].sort(),
    [products]
  );
  const brands = useMemo(
    () => [...new Map((products ?? []).map((product) => [product.brand.id, product.brand])).values()],
    [products]
  );

  const counts = useMemo(() => {
    const list = products ?? [];
    return {
      all: list.length,
      inStock: list.filter((product) => product.stock > 0).length,
      lowStock: list.filter((product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD).length,
      outOfStock: list.filter((product) => product.stock <= 0).length,
      onSale: list.filter((product) => product.salePrice !== null).length,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (products ?? [])
      .filter((product) => {
        if (query && !`${product.name} ${product.brand.name} ${product.categoryPath}`.toLowerCase().includes(query))
          return false;
        if (stockFilter === "inStock" && product.stock <= 0) return false;
        if (stockFilter === "lowStock" && (product.stock <= 0 || product.stock > LOW_STOCK_THRESHOLD)) return false;
        if (stockFilter === "outOfStock" && product.stock > 0) return false;
        if (stockFilter === "onSale" && product.salePrice === null) return false;
        if (groupFilter && !product.categoryPath.startsWith(groupFilter)) return false;
        if (brandFilter && product.brand.id !== brandFilter) return false;
        return true;
      })
      .sort(sorters[sort]);
  }, [products, search, stockFilter, groupFilter, brandFilter, sort]);

  const updateStock = (id: string, stock: number) =>
    setProducts(
      (list) => list?.map((item) => (item.id === id ? { ...item, stock, isAvailable: stock > 0 } : item)) ?? null
    );

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    const response = await deleteProduct(toDelete.id);
    setIsDeleting(false);
    if (response.error) {
      toast.error("Can't delete the product");
      return;
    }
    toast.success(`${toDelete.name} was deleted`);
    setToDelete(null);
    reload();
  };

  const tabs: { key: TStockFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "inStock", label: "In stock" },
    { key: "lowStock", label: "Low stock" },
    { key: "outOfStock", label: "Out of stock" },
    { key: "onSale", label: "On sale" },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog, prices, stock and images."
        actions={
          <AdminButton variant="primary" onClick={() => openEditor({ mode: "new" })}>
            <Plus className="size-4" /> Add product
          </AdminButton>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1 sm:w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStockFilter(tab.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  stockFilter === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-xs tabular-nums",
                    stockFilter === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500"
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
            <SearchInput placeholder="Search by name, brand or category…" value={search} onValueChange={setSearch} />
            <AdminSelect value={groupFilter} onChange={(e) => setGroupFilter(e.currentTarget.value)}>
              <option value="">All categories</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect value={brandFilter} onChange={(e) => setBrandFilter(e.currentTarget.value)}>
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect value={sort} onChange={(e) => setSort(e.currentTarget.value as TSort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
            </AdminSelect>
          </div>
        </div>

        {products === null ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length ? "No products match your filters" : "No products yet"}
            description={products.length ? "Try a different search or filter." : "Add your first product to start selling."}
            action={
              !products.length && (
                <AdminButton variant="primary" onClick={() => openEditor({ mode: "new" })}>
                  <Plus className="size-4" /> Add product
                </AdminButton>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Brand</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => {
                  const image = productImageUrl(product.images[0]);
                  const discount = discountPercent(product.price, product.salePrice);
                  return (
                    <tr key={product.id} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => openEditor({ mode: "edit", id: product.id })}
                          className="flex cursor-pointer items-center gap-3 text-left"
                        >
                          <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                            {image ? (
                              <Image src={image} alt={product.name} fill sizes="48px" className="object-contain p-1" />
                            ) : (
                              <ImageOff className="size-4 text-slate-400" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[320px] truncate font-medium text-slate-900 group-hover:text-brand-700">
                              {product.name}
                            </span>
                            <span className="block max-w-[320px] truncate text-xs text-slate-500">
                              {product.categoryPath}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <Badge>{product.brand.name}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {formatPrice(product.salePrice ?? product.price)}
                          </span>
                          {discount > 0 && <Badge tone="danger">-{discount}%</Badge>}
                        </div>
                        {product.salePrice !== null && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StockCell
                          key={product.stock}
                          productID={product.id}
                          productName={product.name}
                          stock={product.stock}
                          onSaved={(stock) => updateStock(product.id, stock)}
                        />
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-500">
                        {timeAgo(product.updatedAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <AdminButton
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => openEditor({ mode: "edit", id: product.id })}
                          >
                            <Pencil className="size-4" />
                          </AdminButton>
                          <Link
                            href={`/product/${product.id}`}
                            target="_blank"
                            title="View in store"
                            aria-label={`View ${product.name} in store`}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <ExternalLink className="size-4" />
                          </Link>
                          <AdminButton
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            aria-label={`Delete ${product.name}`}
                            className="hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setToDelete(product)}
                          >
                            <Trash2 className="size-4" />
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {products !== null && visibleProducts.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {formatNumber(visibleProducts.length)} of {formatNumber(products.length)} products
          </div>
        )}
      </Card>

      {editor && (
        <ProductEditor
          key={editor.mode === "edit" ? editor.id : "new"}
          productID={editor.mode === "edit" ? editor.id : undefined}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            reload();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete product?"
          message={
            <>
              <span className="font-medium text-slate-900">{toDelete.name}</span> will be removed from your store. This
              can&apos;t be undone.
            </>
          }
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
};
