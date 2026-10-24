"use server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TBrand } from "@/shared/types";
import { TAdminBrand } from "@/shared/types/admin";

const BrandName = z.string().trim().min(2, "Brand name must be at least 2 characters").max(60);

const ValidateUpdateBrand = z.object({
  id: z.string().min(1),
  name: BrandName,
});

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export const addBrand = async (brandName: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = BrandName.safeParse(brandName);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await db.brand.create({
      data: {
        name: parsed.data,
      },
    });
    return { res: result };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: `"${parsed.data}" already exists` };
    return { error: "Can't add the brand" };
  }
};

export const getAllBrands = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const result: TBrand[] = await db.brand.findMany({ orderBy: { name: "asc" } });
    return { res: result };
  } catch {
    return { error: "Can't load brands" };
  }
};

export const getAdminBrands = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const brands = await db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    const result: TAdminBrand[] = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      productCount: brand._count.products,
    }));
    return { res: result };
  } catch {
    return { error: "Can't load brands" };
  }
};

export const deleteBrand = async (brandID: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!brandID || brandID === "") return { error: "Invalid Data!" };
  try {
    const productCount = await db.product.count({ where: { brandID } });
    if (productCount > 0) {
      return { error: `This brand is used by ${productCount} product${productCount > 1 ? "s" : ""}` };
    }

    const result = await db.brand.delete({
      where: {
        id: brandID,
      },
    });
    return { res: result };
  } catch {
    return { error: "Can't delete the brand" };
  }
};

export const updateBrand = async (data: TBrand) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = ValidateUpdateBrand.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await db.brand.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
    return { res: result };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: `"${parsed.data.name}" already exists` };
    return { error: "Can't update the brand" };
  }
};
