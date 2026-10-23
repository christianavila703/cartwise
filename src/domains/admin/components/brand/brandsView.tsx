"use client";

import { Package, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { addBrand, deleteBrand, getAdminBrands, updateBrand } from "@/actions/brands/brands";
import { TAdminBrand } from "@/shared/types/admin";

import { formatNumber } from "../../utils";
import { AdminButton } from "../ui/button";
import { Card } from "../ui/card";
import { AdminInput, Field, SearchInput } from "../ui/field";
import { EmptyState, PageHeader, Skeleton } from "../ui/misc";
import { ConfirmDialog, Modal } from "../ui/overlay";
import { useToast } from "../ui/toast";

const monogramColors = [
  "from-brand-500 to-brand-700",
  "from-violet-500 to-fuchsia-600",
  "from-emerald-500 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-cyan-600",
];

export const BrandsView = () => {
  const toast = useToast();
  const [brands, setBrands] = useState<TAdminBrand[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<TAdminBrand | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<TAdminBrand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const response = await getAdminBrands();
      if (ignore) return;
      if (response.res) setBrands(response.res);
      else toast.error(response.error ?? "Can't load brands");
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const reload = () => setReloadKey((key) => key + 1);

  const visibleBrands = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (brands ?? []).filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brands, search]);

  const totalProducts = (brands ?? []).reduce((sum, brand) => sum + brand.productCount, 0);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);
    const response = await addBrand(newName);
    setIsAdding(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(`${newName.trim()} was added`);
    setNewName("");
    reload();
  };

  const openEdit = (brand: TAdminBrand) => {
    setEditing(brand);
    setEditName(brand.name);
    setEditError("");
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    const response = await updateBrand({ id: editing.id, name: editName });
    setIsSaving(false);
    if (response.error) {
      setEditError(response.error);
      return;
    }
    toast.success("Brand renamed");
    setEditing(null);
    reload();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    const response = await deleteBrand(toDelete.id);
    setIsDeleting(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(`${toDelete.name} was deleted`);
    setToDelete(null);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Brands"
        description={
          brands
            ? `${formatNumber(brands.length)} brands across ${formatNumber(totalProducts)} products.`
            : "Manage the brands products are grouped by."
        }
      />

      <Card className="mb-6 p-5">
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="New brand" className="flex-1">
            <AdminInput
              placeholder="e.g. Nintendo"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              maxLength={60}
            />
          </Field>
          <AdminButton type="submit" variant="primary" isLoading={isAdding} disabled={!newName.trim()}>
            <Plus className="size-4" /> Add brand
          </AdminButton>
        </form>
      </Card>

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search brands…" value={search} onValueChange={setSearch} />
      </div>

      {brands === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[120px] rounded-2xl" />
          ))}
        </div>
      ) : visibleBrands.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tags}
            title={brands.length ? "No brands match your search" : "No brands yet"}
            description={brands.length ? undefined : "Add your first brand above."}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleBrands.map((brand) => {
            const color =
              monogramColors[[...brand.name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % monogramColors.length];
            return (
              <li key={brand.id}>
                <Card className="group flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-md ${color}`}
                  >
                    {brand.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{brand.name}</p>
                    <Link
                      href="/admin/products"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs whitespace-nowrap text-slate-500 hover:text-brand-600"
                    >
                      <Package className="size-3.5" />
                      {brand.productCount} product{brand.productCount === 1 ? "" : "s"}
                    </Link>
                  </div>
                  <div className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <AdminButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${brand.name}`}
                      onClick={() => openEdit(brand)}
                    >
                      <Pencil className="size-4" />
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${brand.name}`}
                      className="hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => setToDelete(brand)}
                    >
                      <Trash2 className="size-4" />
                    </AdminButton>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Modal
          title="Rename brand"
          size="sm"
          onClose={() => setEditing(null)}
          footer={
            <>
              <AdminButton onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" onClick={() => handleSave()} isLoading={isSaving}>
                Save
              </AdminButton>
            </>
          }
        >
          <form onSubmit={handleSave}>
            <Field label="Brand name" error={editError}>
              <AdminInput autoFocus value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
            </Field>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title={toDelete.productCount ? "Brand is in use" : "Delete brand?"}
          message={
            toDelete.productCount ? (
              <>
                <span className="font-medium text-slate-900">{toDelete.name}</span> is used by {toDelete.productCount}{" "}
                product{toDelete.productCount === 1 ? "" : "s"}. Move or delete those products first.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{toDelete.name}</span> will be removed. This can&apos;t
                be undone.
              </>
            )
          }
          confirmText={toDelete.productCount ? "Got it" : "Delete"}
          tone={toDelete.productCount ? "primary" : "danger"}
          isLoading={isDeleting}
          onConfirm={toDelete.productCount ? () => setToDelete(null) : handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
};
