"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

import { addCategory, TGetAllCategories, updateCategory, TUpdateCategory } from "@/actions/category/category";
import { cn } from "@/shared/utils/styling";

import { AdminButton } from "../ui/button";
import { AdminInput, Field } from "../ui/field";
import { Modal } from "../ui/overlay";
import { useToast } from "../ui/toast";

// icons available in /public/icons with their natural sizes, used for top-level groups in the store menu
export const CATEGORY_ICONS: { name: string; size: [number, number] }[] = [
  { name: "computerIcon", size: [17, 15] },
  { name: "phoneIcon", size: [12, 18] },
  { name: "tabletIcon", size: [20, 16] },
  { name: "watchIcon", size: [12, 18] },
  { name: "tvIcon", size: [17, 13] },
  { name: "gameIcon", size: [18, 11] },
  { name: "cameraIcon", size: [18, 14] },
  { name: "musicIcon", size: [16, 16] },
  { name: "mouseIcon", size: [12, 17] },
  { name: "pcComponentIcon", size: [13, 18] },
  { name: "printerIcon", size: [15, 14] },
  { name: "healthIcon", size: [13, 11] },
  { name: "clockIcon", size: [14, 14] },
  { name: "otherCatIcon", size: [16, 16] },
];

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type TProps = {
  /** category being edited; omitted when adding */
  category?: TGetAllCategories;
  /** parent of the new category; null adds a top-level group */
  parent?: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
};

export const CategoryFormModal = ({ category, parent = null, onClose, onSaved }: TProps) => {
  const toast = useToast();
  const isEdit = !!category;
  const isGroup = isEdit ? category.parentID === null : parent === null;

  const [name, setName] = useState(category?.name ?? "");
  const [url, setUrl] = useState(category?.url ?? "");
  const [urlTouched, setUrlTouched] = useState(isEdit);
  const [icon, setIcon] = useState(category?.iconUrl ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    if (isGroup && !icon) {
      setError("Choose an icon for the group");
      return;
    }
    const iconSize = CATEGORY_ICONS.find((item) => item.name === icon)?.size ?? [16, 16];

    setIsSaving(true);
    let response;
    if (isEdit) {
      const data: TUpdateCategory = { id: category.id, iconSize: isGroup ? iconSize : category.iconSize };
      if (name !== category.name) data.name = name;
      if (url !== category.url) data.url = url;
      if (isGroup && icon !== category.iconUrl) data.iconUrl = icon;
      response = await updateCategory(data);
    } else {
      response = await addCategory({
        parentID: parent?.id ?? null,
        name,
        url,
        iconUrl: isGroup ? icon : null,
        iconSize: isGroup ? iconSize : [],
      });
    }
    setIsSaving(false);

    if (response.error) {
      setError(response.error);
      return;
    }
    toast.success(isEdit ? `${name} was saved` : `${name} was added`);
    onSaved();
  };

  const title = isEdit
    ? `Edit ${isGroup ? "group" : "category"}`
    : parent
      ? `Add to ${parent.name}`
      : "New category group";

  return (
    <Modal
      title={title}
      description={isGroup ? "Groups appear in the store's category menu" : undefined}
      size={isGroup ? "lg" : "md"}
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose} disabled={isSaving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => handleSubmit()} isLoading={isSaving}>
            {isEdit ? "Save" : "Create"}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name" required>
          <AdminInput
            autoFocus
            value={name}
            placeholder={isGroup ? "e.g. Smart Home" : "e.g. Gaming Laptops"}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setName(value);
              if (!urlTouched) setUrl(toSlug(value));
            }}
          />
        </Field>
        <Field label="URL" required hint="Lowercase letters, numbers and dashes. Used in the store address.">
          <AdminInput
            value={url}
            prefix={<span className="font-mono text-xs">/list/…/</span>}
            className="pl-[86px] font-mono"
            onChange={(e) => {
              setUrlTouched(true);
              setUrl(e.currentTarget.value);
            }}
          />
        </Field>
        {isGroup && (
          <div>
            <span className="text-[13px] font-medium text-slate-700">
              Icon<span className="ml-0.5 text-red-500">*</span>
            </span>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {CATEGORY_ICONS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  title={item.name.replace(/Icon$/, "")}
                  onClick={() => setIcon(item.name)}
                  className={cn(
                    "flex aspect-square cursor-pointer items-center justify-center rounded-xl ring-1 transition-all",
                    icon === item.name
                      ? "bg-brand-50 ring-2 ring-brand-500"
                      : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                  )}
                >
                  <Image src={`/icons/${item.name}.svg`} alt="" width={item.size[0]} height={item.size[1]} />
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
};
