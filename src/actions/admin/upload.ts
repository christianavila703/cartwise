"use server";

import { v2 as cloudinary } from "cloudinary";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { TImageUploadSignature } from "@/shared/types/admin";

const UPLOAD_FOLDER = "cartwise/products";

/**
 * Signs a direct browser-to-Cloudinary upload, so image files never pass through the Next.js server
 * and the API secret never leaves it.
 */
export const getImageUploadSignature = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!process.env.CLOUDINARY_URL) return { error: "Image upload is not configured (CLOUDINARY_URL is missing)" };

  try {
    cloudinary.config(true);
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    if (!cloud_name || !api_key || !api_secret) return { error: "CLOUDINARY_URL is invalid" };

    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder: UPLOAD_FOLDER }, api_secret);

    const result: TImageUploadSignature = {
      cloudName: cloud_name,
      apiKey: api_key,
      timestamp,
      signature,
      folder: UPLOAD_FOLDER,
    };
    return { res: result };
  } catch {
    return { error: "Can't prepare the upload" };
  }
};
