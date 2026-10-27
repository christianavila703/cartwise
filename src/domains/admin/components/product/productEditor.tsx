"use client";

import { SpecGroup } from "@prisma/client";
import { AlertCircle, ExternalLink, Plus, X } from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

import { getAllBrands } from "@/actions/brands/brands";
import { getAllCategoriesJSON } from "@/actions/category/category";
import { getCategorySpecs } from "@/actions/category/specifications";
import { addProduct, getProductForEdit, updateProduct } from "@/actions/product/product";
import { TBrand } from "@/shared/types";
import { TGroupJSON } from "@/shared/types/categories";
import { ProductSpec } from "@/shared/types/common";
import { TAddProductFormValues } from "@/shared/types/product";

import { discountPercent } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { AdminInput, AdminSelect, AdminTextarea, Field } from "../ui/field";
import { Skeleton } from "../ui/misc";
import { Drawer } from "../ui/overlay";
import { useToast } from "../ui/toast";

import { ImageManager } from "./imageManager";
import { StockBadge } from "./stockBadge";

const MAX_FEATURES = 6;

const emptyForm: TAddProductFormValues = {
  name: "",
  desc: "",
  brandID: "",
  categoryID: "",
  stock: "",
  price: "",
  salePrice: "",
  images: [],
  specialFeatures: ["", "", ""],
  specifications: [],
};

/** Lines spec values up with the category's spec groups, keeping values already entered for the same group. */
const alignSpecs = (groups: SpecGroup[], current: ProductSpec[]): ProductSpec[] =>
  groups.map((group) => {
    const existing = current.find((spec) => spec.specGroupID === group.id);
    return {
      specGroupID: group.id,
      specValues: group.specs.map((_, index) => existing?.specValues[index] ?? ""),
    };
  });

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
    </div>
    {children}
  </section>
);

type TProps = {
  productID?: string;
  onClose: () => void;
  onSaved: () => void;
};

export const ProductEditor = ({ productID, onClose, onSaved }: TProps) => {
  const toast = useToast();
  const isEdit = !!productID;

  const [form, setForm] = useState<TAddProductFormValues>(emptyForm);
  const [brands, setBrands] = useState<TBrand[]>([]);
  const [categories, setCategories] = useState<TGroupJSON[]>([]);
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const [brandsResponse, categoriesResponse, productResponse] = await Promise.all([
        getAllBrands(),
        getAllCategoriesJSON(),
        productID ? getProductForEdit(productID) : Promise.resolve(null),
      ]);
      if (ignore) return;

      if (brandsResponse.res) setBrands(brandsResponse.res);
      if (categoriesResponse.res) setCategories(categoriesResponse.res);

      if (productResponse) {
        if (!productResponse.res) {
          toast.error(productResponse.error ?? "Can't load the product");
          onClose();
          return;
        }
        const product = productResponse.res;
        const specsResponse = await getCategorySpecs(product.categoryID);
        if (ignore) return;
        const groups = specsResponse.res ?? [];
        setSpecGroups(groups);
        setForm({ ...product, specifications: alignSpecs(groups, product.specifications) });
      }
      setIsLoading(false);
    };
    load();
    return () => {
      ignore = true;
    };
    // load once per opened product
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productID]);

  const update = (values: Partial<TAddProductFormValues>) => setForm((current) => ({ ...current, ...values }));

  const handleCategoryChange = async (categoryID: string) => {
    update({ categoryID });
    if (!categoryID) {
      setSpecGroups([]);
      update({ specifications: [] });
      return;
    }
    const response = await getCategorySpecs(categoryID);
    const groups = response.res ?? [];
    setSpecGroups(groups);
    setForm((current) => ({ ...current, specifications: alignSpecs(groups, current.specifications) }));
  };

  const setSpecValue = (groupIndex: number, specIndex: number, value: string) =>
    setForm((current) => ({
      ...current,
      specifications: current.specifications.map((spec, index) =>
        index === groupIndex
          ? { ...spec, specValues: spec.specValues.map((item, i) => (i === specIndex ? value : item)) }
          : spec
      ),
    }));

  const setFeature = (index: number, value: string) =>
    setForm((current) => ({
      ...current,
      specialFeatures: current.specialFeatures.map((item, i) => (i === index ? value : item)),
    }));

  const handleSave = async () => {
    setError("");
    setIsSaving(true);
    const response = isEdit ? await updateProduct(productID, form) : await addProduct(form);
    setIsSaving(false);

    if (response.error) {
      setError(response.error);
      return;
    }
    toast.success(isEdit ? "Product saved" : `${form.name} was added to the catalog`);
    onSaved();
  };

  const price = Number(form.price.replace(",", "."));
  const salePrice = Number((form.salePrice ?? "").replace(",", "."));
  const discount = price > 0 && salePrice > 0 && salePrice < price ? discountPercent(price, salePrice) : 0;

  return (
    <Drawer
      title={isEdit ? "Edit product" : "New product"}
      description={isEdit ? form.name || "Loading…" : "Add a product to your storefront"}
      onClose={onClose}
      footer={
        <>
          {isEdit && (
            <Link
              href={`/product/${productID}`}
              target="_blank"
              className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ExternalLink className="size-4" /> View in store
            </Link>
          )}
          <AdminButton onClick={onClose} disabled={isSaving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={handleSave} isLoading={isSaving} disabled={isLoading}>
            {isEdit ? "Save changes" : "Create product"}
          </AdminButton>
        </>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {error && (
            <div className="flex animate-admin-scale items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}

          <Section title="Details" description="What customers see first">
            <div className="flex flex-col gap-4">
              <Field label="Product name" required>
                <AdminInput
                  value={form.name}
                  placeholder="e.g. Apple iPhone 15 Pro Max"
                  onChange={(e) => update({ name: e.currentTarget.value })}
                />
              </Field>
              <Field label="Short description" hint="Shown under the product name">
                <AdminTextarea
                  value={form.desc}
                  placeholder="A sentence or two about the product"
                  onChange={(e) => update({ desc: e.currentTarget.value })}
                />
              </Field>
              <div>
                <span className="text-[13px] font-medium text-slate-700">Highlights</span>
                <p className="mb-2 text-xs text-slate-500">Short selling points shown on product cards</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {form.specialFeatures.map((feature, index) => (
                    <div key={index} className="relative">
                      <AdminInput
                        value={feature}
                        placeholder={`Highlight ${index + 1}`}
                        onChange={(e) => setFeature(index, e.currentTarget.value)}
                        className={index >= 3 ? "pr-9" : undefined}
                      />
                      {index >= 3 && (
                        <button
                          type="button"
                          aria-label="Remove highlight"
                          onClick={() =>
                            update({ specialFeatures: form.specialFeatures.filter((_, i) => i !== index) })
                          }
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.specialFeatures.length < MAX_FEATURES && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => update({ specialFeatures: [...form.specialFeatures, ""] })}
                  >
                    <Plus className="size-3.5" /> Add highlight
                  </AdminButton>
                )}
              </div>
            </div>
          </Section>

          <Section title="Pricing & availability">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price" required>
                <AdminInput
                  inputMode="decimal"
                  prefix="€"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => update({ price: e.currentTarget.value })}
                />
              </Field>
              <Field
                label="Sale price"
                hint={discount ? undefined : "Leave empty when the product isn't on sale"}
              >
                <AdminInput
                  inputMode="decimal"
                  prefix="€"
                  placeholder="0.00"
                  value={form.salePrice}
                  onChange={(e) => update({ salePrice: e.currentTarget.value })}
                  suffix={discount ? <Badge tone="danger">-{discount}%</Badge> : undefined}
                  className={discount ? "pr-20" : undefined}
                />
              </Field>
            </div>
            <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
              <Field label="Stock quantity" required hint="Units ready to ship. At 0 the product shows as out of stock.">
                <AdminInput
                  inputMode="numeric"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => update({ stock: e.currentTarget.value.replace(/[^\d]/g, "") })}
                  suffix={<span className="text-xs">units</span>}
                  className="pr-14"
                />
              </Field>
              <div className="pb-6">
                <StockBadge stock={Number(form.stock || 0)} />
              </div>
            </div>
          </Section>

          <Section title="Organization">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required hint="Specifications below depend on the category">
                <AdminSelect value={form.categoryID} onChange={(e) => handleCategoryChange(e.currentTarget.value)}>
                  <option value="">Select a category…</option>
                  {categories.map(({ group, categories: groupCategories }) => (
                    <optgroup key={group.id} label={group.name}>
                      {groupCategories.flatMap(({ category, subCategories }) => [
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>,
                        ...subCategories.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {`${category.name} › ${sub.name}`}
                          </option>
                        )),
                      ])}
                    </optgroup>
                  ))}
                </AdminSelect>
              </Field>
              <Field label="Brand" required>
                <AdminSelect value={form.brandID} onChange={(e) => update({ brandID: e.currentTarget.value })}>
                  <option value="">Select a brand…</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </AdminSelect>
              </Field>
            </div>
          </Section>

          <Section title="Images" description="The first image is the cover shown in lists">
            <ImageManager
              images={form.images}
              onChange={(updateImages) => setForm((current) => ({ ...current, images: updateImages(current.images) }))}
            />
          </Section>

          <Section title="Specifications" description="Shown in the specification table on the product page">
            {specGroups.length ? (
              <div className="flex flex-col gap-4">
                {specGroups.map((group, groupIndex) => (
                  <div key={group.id} className="rounded-xl ring-1 ring-slate-200">
                    <p className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                      {group.title}
                    </p>
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      {group.specs.map((spec, specIndex) => (
                        <Field key={`${spec}-${specIndex}`} label={spec}>
                          <AdminInput
                            value={form.specifications[groupIndex]?.specValues[specIndex] ?? ""}
                            onChange={(e) => setSpecValue(groupIndex, specIndex, e.currentTarget.value)}
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {form.categoryID
                  ? "This category has no specification groups yet. Add them under Categories."
                  : "Choose a category to fill in its specifications."}
              </p>
            )}
          </Section>
        </div>
      )}
    </Drawer>
  );
};
