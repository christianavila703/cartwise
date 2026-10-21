import path from "path";

import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

// Uploads every product image referenced in the database from /public to Cloudinary.
// The public_id mirrors the stored path ("/images/products/a.jpg" -> "images/products/a"),
// so NEXT_PUBLIC_IMAGE_BASE_URL + path resolves to the uploaded file.
// Credentials are read from CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud>).

const db = new PrismaClient();

async function main() {
  if (!process.env.CLOUDINARY_URL) throw new Error("CLOUDINARY_URL is not set");
  cloudinary.config(true);

  const products = await db.product.findMany({ select: { images: true } });
  const imagePaths = [...new Set(products.flatMap((product) => product.images))].filter((image) =>
    image.startsWith("/")
  );

  let uploaded = 0;
  for (const imagePath of imagePaths) {
    const publicId = imagePath.slice(1).replace(/\.[^/.]+$/, "");
    const filePath = path.join(process.cwd(), "public", imagePath);
    await cloudinary.uploader.upload(filePath, { public_id: publicId, overwrite: false, resource_type: "image" });
    uploaded++;
    console.log(`[${uploaded}/${imagePaths.length}] ${publicId}`);
  }

  const { cloud_name } = cloudinary.config();
  console.log(`\nDone. Set NEXT_PUBLIC_IMAGE_BASE_URL="https://res.cloudinary.com/${cloud_name}/image/upload"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
