"use server";
import { z } from "zod";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TAdminProduct } from "@/shared/types/admin";
import { ProductSpec } from "@/shared/types/common";
import {
  TAddProductFormValues,
  TCartListItemDB,
  TPath,
  TProductPageInfo,
  TSpecification,
} from "@/shared/types/product";

const priceString = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => value === "" || (!isNaN(Number(value)) && Number(value) >= 0), "Invalid price");

const ValidateProduct = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    brandID: z.string().min(1, "Select a brand"),
    specialFeatures: z.array(z.string().trim()),
    desc: z.string().trim().optional(),
    images: z.array(z.string().trim().min(1)).min(1, "Add at least one image"),
    categoryID: z.string().min(1, "Select a category"),
    price: priceString.refine((value) => value !== "" && Number(value) > 0, "Price is required"),
    salePrice: priceString.optional(),
    stock: z
      .string()
      .trim()
      .regex(/^\d+$/, "Stock must be a whole number")
      .refine((value) => Number(value) <= 100_000, "Stock is too large"),
    specifications: z.array(
      z.object({
        specGroupID: z.string().min(1),
        specValues: z.array(z.string()),
      })
    ),
  })
  .refine((data) => !data.salePrice || Number(data.salePrice) < Number(data.price), {
    message: "Sale price must be lower than the price",
    path: ["salePrice"],
  });

const toProductData = (data: z.infer<typeof ValidateProduct>) => ({
  name: data.name,
  desc: data.desc || null,
  brandID: data.brandID,
  categoryID: data.categoryID,
  specialFeatures: data.specialFeatures.filter((feature) => feature !== ""),
  // availability follows from the stock (kept in sync by a database trigger)
  stock: Number(data.stock),
  price: Number(data.price),
  salePrice: data.salePrice ? Number(data.salePrice) : null,
  images: data.images,
  specs: data.specifications,
});

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid Data!";

export const addProduct = async (data: TAddProductFormValues) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = ValidateProduct.safeParse(data);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const result = await db.product.create({ data: toProductData(parsed.data), select: { id: true } });
    return { res: result };
  } catch {
    return { error: "Can't save the product" };
  }
};

export const updateProduct = async (id: string, data: TAddProductFormValues) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };
  const parsed = ValidateProduct.safeParse(data);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const result = await db.product.update({ where: { id }, data: toProductData(parsed.data), select: { id: true } });
    return { res: result };
  } catch {
    return { error: "Can't save the product" };
  }
};

export const setProductStock = async (id: string, stock: number) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id || !Number.isInteger(stock) || stock < 0 || stock > 100_000) return { error: "Invalid stock quantity" };

  try {
    const result = await db.product.update({
      where: { id },
      data: { stock },
      select: { id: true, stock: true, isAvailable: true },
    });
    return { res: result };
  } catch {
    return { error: "Can't update the product" };
  }
};

/** Product values shaped for the admin form. */
export const getProductForEdit = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };

  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) return { error: "Product not found" };

    const formValues: TAddProductFormValues = {
      name: product.name,
      desc: product.desc ?? "",
      brandID: product.brandID,
      categoryID: product.categoryID,
      stock: String(product.stock),
      price: String(product.price),
      salePrice: product.salePrice !== null ? String(product.salePrice) : "",
      images: product.images,
      specialFeatures: [...product.specialFeatures, "", "", ""].slice(0, Math.max(3, product.specialFeatures.length)),
      specifications: product.specs as ProductSpec[],
    };
    return { res: formValues };
  } catch {
    return { error: "Can't load the product" };
  }
};

export const getAllProducts = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          images: true,
          price: true,
          salePrice: true,
          isAvailable: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      db.category.findMany({ select: { id: true, name: true, parentID: true } }),
    ]);

    const categoryByID = new Map(categories.map((category) => [category.id, category]));
    const getCategoryPath = (categoryID: string) => {
      const names: string[] = [];
      let current = categoryByID.get(categoryID);
      while (current && names.length < 5) {
        names.unshift(current.name);
        current = current.parentID ? categoryByID.get(current.parentID) : undefined;
      }
      return names.join(" / ");
    };

    const result: TAdminProduct[] = products.map((product) => ({
      ...product,
      categoryPath: getCategoryPath(product.category.id),
    }));
    return { res: result };
  } catch {
    return { error: "Can't load products" };
  }
};

export const getOneProduct = async (productID: string) => {
  if (!productID || productID === "") return { error: "Invalid Product ID!" };

  try {
    const result = await db.product.findFirst({
      where: {
        id: productID,
      },
      select: {
        id: true,
        name: true,
        desc: true,
        images: true,
        price: true,
        salePrice: true,
        specs: true,
        specialFeatures: true,
        isAvailable: true,
        stock: true,
        optionSets: true,
        category: {
          select: {
            id: true,
            parentID: true,
          },
        },
      },
    });
    if (!result) return { error: "Invalid Data!" };

    const specifications = await generateSpecTable(result.specs as ProductSpec[]);
    if (!specifications || specifications.length === 0) return { error: "Invalid Date" };

    const pathArray: TPath[] | null = await getPathByCategoryID(result.category.id, result.category.parentID);
    if (!pathArray || pathArray.length === 0) return { error: "Invalid Date" };

    //eslint-disable-next-line
    const { specs, ...others } = result;
    const mergedResult: TProductPageInfo = {
      ...others,
      specifications,
      path: pathArray,
    };

    return { res: mergedResult };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getCartProducts = async (productIDs: string[]) => {
  if (!productIDs || productIDs.length === 0) return { error: "Invalid Product List" };

  try {
    const result: TCartListItemDB[] | null = await db.product.findMany({
      where: {
        id: { in: productIDs },
      },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        salePrice: true,
        stock: true,
      },
    });

    if (!result) return { error: "Can't Get Data from Database!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getFavoriteProducts = async (productIDs: string[]) => {
  if (!productIDs || productIDs.length === 0) return { res: [] };

  try {
    const result = await db.product.findMany({
      where: { id: { in: productIDs } },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        salePrice: true,
        specialFeatures: true,
        isAvailable: true,
      },
    });
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const deleteProduct = async (productID: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!productID || productID === "") return { error: "Invalid Data!" };
  try {
    const result = await db.product.delete({
      where: {
        id: productID,
      },
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

const generateSpecTable = async (rawSpec: ProductSpec[]) => {
  try {
    const specGroupIDs = rawSpec.map((spec) => spec.specGroupID);

    const result = await db.specGroup.findMany({
      where: {
        id: { in: specGroupIDs },
      },
    });
    if (!result || result.length === 0) return null;

    const specifications: TSpecification[] = [];

    rawSpec.forEach((spec) => {
      const groupSpecIndex = result.findIndex((g: { id: string }) => g.id === spec.specGroupID);
      const tempSpecs: { name: string; value: string }[] = [];
      spec.specValues.forEach((s: string, index: number) => {
        tempSpecs.push({
          name: result[groupSpecIndex].specs[index] || "",
          value: s || "",
        });
      });

      specifications.push({
        groupName: result[groupSpecIndex].title || "",
        specs: tempSpecs,
      });
    });
    if (specifications.length === 0) return null;

    return specifications;
  } catch {
    return null;
  }
};

const getPathByCategoryID = async (categoryID: string, parentID: string | null) => {
  try {
    if (!categoryID || categoryID === "") return null;
    if (!parentID || parentID === "") return null;
    const result: TPath[] = await db.category.findMany({
      where: {
        OR: [{ id: categoryID }, { id: parentID }, { parentID: null }],
      },
      select: {
        id: true,
        parentID: true,
        name: true,
        url: true,
      },
    });
    if (!result || result.length === 0) return null;

    const path: TPath[] = [];
    let tempCatID: string | null = categoryID;
    let searchCount = 0;

    const generatePath = () => {
      const foundCatIndex = result.findIndex((cat) => cat.id === tempCatID);
      if (foundCatIndex === -1) return;
      path.unshift(result[foundCatIndex]);
      tempCatID = result[foundCatIndex].parentID;
      if (!tempCatID) return;
      searchCount++;
      if (searchCount <= 3) generatePath();
      return;
    };
    generatePath();

    if (!path || path.length === 0) return null;
    return path;
  } catch {
    return null;
  }
};
