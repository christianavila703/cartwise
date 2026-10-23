"use server";
import { z } from "zod";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TBrand } from "@/shared/types";

const ValidateUpdateBrand = z.object({
  id: z.string().min(6),
  name: z.string().min(3),
});

export const addBrand = async (brandName: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!brandName || brandName === "") return { error: "Invalid Data!" };

  try {
    const result = await db.brand.create({
      data: {
        name: brandName,
      },
    });
    if (!result) return { error: "Can't Insert Data" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getAllBrands = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const result: TBrand[] | null = await db.brand.findMany();

    if (!result) return { error: "Can't Get Data from Database!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const deleteBrand = async (brandID: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!brandID || brandID === "") return { error: "Invalid Data!" };
  try {
    const result = await db.brand.delete({
      where: {
        id: brandID,
      },
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const updateBrand = async (data: TBrand) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!ValidateUpdateBrand.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    const result = await db.brand.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
      },
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};
