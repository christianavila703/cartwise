"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { DragEvent, useRef, useState } from "react";

import { getImageUploadSignature } from "@/actions/admin/upload";
import { cn } from "@/shared/utils/styling";

import { productImageUrl } from "../../utils";
import { AdminButton } from "../ui/button";
import { AdminInput } from "../ui/field";
import { useToast } from "../ui/toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type TProps = {
  images: string[];
  /** receives an updater, so concurrent uploads always build on the latest list */
  onChange: (update: (images: string[]) => string[]) => void;
};

/** Uploads straight from the browser to Cloudinary with a server-signed request. */
const uploadToCloudinary = async (file: File) => {
  const signed = await getImageUploadSignature();
  if (!signed.res) throw new Error(signed.error ?? "Upload failed");

  const { cloudName, apiKey, timestamp, signature, folder } = signed.res;
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  const data = (await response.json()) as { public_id?: string; format?: string; error?: { message: string } };
  if (!response.ok || !data.public_id) throw new Error(data.error?.message ?? "Upload failed");

  // stored relative to NEXT_PUBLIC_IMAGE_BASE_URL, like the seeded images
  return `/${data.public_id}.${data.format}`;
};

export const ImageManager = ({ images, onChange }: TProps) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pathValue, setPathValue] = useState("");

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    const valid = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    setUploadingCount((count) => count + valid.length);
    await Promise.all(
      valid.map(async (file) => {
        try {
          const path = await uploadToCloudinary(file);
          onChange((current) => [...current, path]);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Upload failed");
        } finally {
          setUploadingCount((count) => count - 1);
        }
      })
    );
  };

  const move = (from: number, to: number) => {
    onChange((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const addPath = () => {
    const value = pathValue.trim();
    if (!value) return;
    onChange((current) => [...current, value.startsWith("/") || value.startsWith("http") ? value : `/${value}`]);
    setPathValue("");
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          {uploadingCount > 0 ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
        </span>
        <p className="mt-3 text-sm font-medium text-slate-800">
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} image${uploadingCount > 1 ? "s" : ""}…`
            : "Drop images here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG or WebP up to 10 MB · uploaded to Cloudinary</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => {
            const src = productImageUrl(image);
            return (
              <li
                key={`${image}-${index}`}
                className="group relative aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"
              >
                {src && <Image src={src} alt="" fill sizes="160px" className="object-contain p-2" />}
                {index === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                    <Star className="size-3 fill-amber-300 text-amber-300" /> Cover
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {[
                    { icon: ArrowLeft, label: "Move left", onClick: () => move(index, index - 1), hidden: index === 0 },
                    { icon: Star, label: "Set as cover", onClick: () => move(index, 0), hidden: index === 0 },
                    {
                      icon: ArrowRight,
                      label: "Move right",
                      onClick: () => move(index, index + 1),
                      hidden: index === images.length - 1,
                    },
                    {
                      icon: Trash2,
                      label: "Remove",
                      onClick: () => onChange((current) => current.filter((_, i) => i !== index)),
                      hidden: false,
                    },
                  ]
                    .filter((action) => !action.hidden)
                    .map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        title={action.label}
                        aria-label={action.label}
                        onClick={action.onClick}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-slate-700 transition-colors hover:bg-white hover:text-slate-950"
                      >
                        <action.icon className="size-3.5" />
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
          {uploadingCount > 0 &&
            Array.from({ length: uploadingCount }, (_, index) => (
              <li
                key={`uploading-${index}`}
                className="flex aspect-square animate-pulse items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200"
              >
                <ImagePlus className="size-5 text-slate-400" />
              </li>
            ))}
        </ul>
      )}

      <div className="flex gap-2">
        <AdminInput
          prefix={<Link2 className="size-4" />}
          placeholder="Or add an existing image path, e.g. /images/products/iphone1.jpg"
          value={pathValue}
          onChange={(event) => setPathValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addPath();
            }
          }}
        />
        <AdminButton onClick={addPath} disabled={!pathValue.trim()}>
          Add
        </AdminButton>
      </div>
    </div>
  );
};
