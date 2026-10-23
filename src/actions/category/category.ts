"use server";
import { z } from "zod";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TCategory, TGroupJSON } from "@/shared/types/categories";

//eslint-disable-next-line
const GetAllCategories = z.object({
  id: z.string(),
  parentID: z.string().min(6).nullable(),
  name: z.string().min(3),
  url: z.string().min(3),
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(3).nullable(),
});

const CategoryName = z.string().trim().min(2, "Name must be at least 2 characters").max(60);
const CategoryUrl = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL can only use lowercase letters, numbers and dashes");

const AddCategory = z.object({
  parentID: z.string().min(1).nullable(),
  name: CategoryName,
  url: CategoryUrl,
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(1).nullable(),
});

const UpdateCategory = z.object({
  id: z.string(),
  name: CategoryName.optional(),
  url: CategoryUrl.optional(),
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(1).optional(),
});

// sibling categories share the same parent path, so their URLs must differ
const isUrlTaken = async (url: string, parentID: string | null, excludeID?: string) =>
  !!(await db.category.findFirst({ where: { url, parentID, NOT: excludeID ? { id: excludeID } : undefined } }));

export type TGetAllCategories = z.infer<typeof GetAllCategories>;
export type TAddCategory = z.infer<typeof AddCategory>;
export type TUpdateCategory = z.infer<typeof UpdateCategory>;

const convertToJson = (categoriesTable: TCategory[]): TGroupJSON[] => {
  const generateCategoryGroups = (categoriesTable: TCategory[]): TGroupJSON[] => {
    return categoriesTable.filter((tableRow) => tableRow.parentID === null).map((group) => ({ group, categories: [] }));
  };

  const fillCategoryArray = (groups: TGroupJSON[], categoriesTable: TCategory[]) => {
    groups.forEach((group) => {
      group.categories = getChildren(categoriesTable, group.group.id).map((category) => ({
        category,
        subCategories: [],
      }));
    });
  };

  const fillSubCategoryArray = (groups: TGroupJSON[], categoriesTable: TCategory[]) => {
    groups.forEach((group) => {
      group.categories.forEach((category) => {
        category.subCategories = getChildren(categoriesTable, category.category.id);
      });
    });
  };

  const getChildren = (array: TCategory[], parentID: string | null): TCategory[] => {
    return array.filter((item) => item.parentID === parentID);
  };

  const groups: TGroupJSON[] = generateCategoryGroups(categoriesTable);
  fillCategoryArray(groups, categoriesTable);
  fillSubCategoryArray(groups, categoriesTable);

  return groups;
};

export const getAllCategories = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const result: TGetAllCategories[] = await db.category.findMany();

    if (!result) return { error: "Can't read categories" };
    return { res: result };
  } catch {
    return { error: "Cant read Category Groups" };
  }
};
export const getAllCategoriesJSON = async () => {
  try {
    const result: TCategory[] = await db.category.findMany();

    if (!result) return { error: "Can't read categories" };
    return { res: convertToJson(result) };
  } catch {
    return { error: "Cant read Category Groups" };
  }
};

export const getCategoryProductCounts = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  try {
    const rows = await db.product.groupBy({ by: ["categoryID"], _count: { _all: true } });
    const result: Record<string, number> = Object.fromEntries(rows.map((row) => [row.categoryID, row._count._all]));
    return { res: result };
  } catch {
    return { error: "Can't load product counts" };
  }
};

export const addCategory = async (data: TAddCategory) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = AddCategory.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  data = parsed.data;

  try {
    if (await isUrlTaken(data.url, data.parentID)) return { error: `The URL "${data.url}" is already used here` };

    const result = await db.category.create({
      data: {
        parentID: data.parentID,
        name: data.name,
        url: data.url,
        iconSize: [...data.iconSize],
        iconUrl: data.iconUrl,
      },
    });
    return { res: result };
  } catch {
    return { error: "Can't add the category" };
  }
};

export const updateCategory = async (data: TUpdateCategory) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = UpdateCategory.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, iconSize, ...values } = parsed.data;

  try {
    if (values.url) {
      const current = await db.category.findUnique({ where: { id }, select: { parentID: true } });
      if (current && (await isUrlTaken(values.url, current.parentID, id))) {
        return { error: `The URL "${values.url}" is already used here` };
      }
    }

    const result = await db.category.update({
      where: {
        id,
      },
      data: {
        iconSize: [...iconSize],
        ...values,
      },
    });
    return { res: result };
  } catch {
    return { error: "Can't update the category" };
  }
};

export const deleteCategory = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Can't delete it!" };

  try {
    const childCount = await db.category.count({ where: { parentID: id } });
    if (childCount > 0) return { error: "Delete or move its sub categories first" };

    const productCount = await db.product.count({ where: { categoryID: id } });
    if (productCount > 0) {
      return { error: `This category has ${productCount} product${productCount > 1 ? "s" : ""}` };
    }

    const result = await db.category.delete({
      where: {
        id,
      },
    });
    return { res: JSON.stringify(result) };
  } catch {
    return { error: "Can't delete the category" };
  }
};
