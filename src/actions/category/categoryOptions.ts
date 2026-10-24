"use server";

import { OptionSetType } from "@prisma/client";
import { z } from "zod";

import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { NameValue, TOptionSet, TSingleOption, TSingleSpec, TSpecGroup } from "@/shared/types/common";

const AddOptionSet = z.object({
  name: z.string().min(3),
  type: z.enum([OptionSetType.COLOR, OptionSetType.TEXT]),
});

const SingleOption = z.object({
  optionSetID: z.string().min(6),
  name: z.string().min(3),
  value: z.string().min(3),
});

const AddSpecGroup = z.object({
  title: z.string().min(3),
});

const SingleSpec = z.object({
  specGroupID: z.string().min(6),
  value: z.string().min(3),
});

export const getOptionSetByCatID = async (categoryID: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!categoryID || categoryID === "") return { error: "Invalid Data!" };

  try {
    const optionSets = await db.optionSet.findMany({
      where: {
        Category_Option: {
          some: {
            categoryID: categoryID,
          },
        },
      },
    });

    if (!optionSets) return { error: "Not Found!" };
    const result: TOptionSet[] = optionSets.map((optionSet) => ({
      ...optionSet,
      options: optionSet.options as NameValue[],
    }));
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

export const addOptionSet = async (data: TOptionSet) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!AddOptionSet.safeParse(data).success) return { error: "Invalid Data" };

  try {
    const result = await db.category.update({
      where: {
        id: data.id,
      },
      data: {
        Category_Option: {
          create: {
            option: {
              create: {
                name: data.name,
                type: data.type,
              },
            },
          },
        },
      },
    });
    if (!result) return { error: "failed" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

export const deleteOptionSet = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id || id === "") return { error: "Invalid Data" };

  try {
    const result = await db.optionSet.delete({
      where: {
        id,
      },
    });
    if (!result) return { error: "failed" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

// ------------------------- SINGLE OPTION -------------------------
export const addSingleOption = async (data: TSingleOption) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!SingleOption.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    const result = await db.$transaction(async (tx) => {
      const optionSet = await tx.optionSet.findUnique({
        where: { id: data.optionSetID },
        select: { options: true },
      });
      if (!optionSet) return null;

      const options = [...(optionSet.options as NameValue[]), { name: data.name, value: data.value }];
      return tx.optionSet.update({
        where: { id: data.optionSetID },
        data: { options },
      });
    });

    if (!result) return { error: "Can't Insert!" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};
export const deleteSingleOption = async (data: TSingleOption) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!SingleOption.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    const result = await db.$transaction(async (tx) => {
      const optionSet = await tx.optionSet.findUnique({
        where: { id: data.optionSetID },
        select: { options: true },
      });
      if (!optionSet) return null;

      const options = (optionSet.options as NameValue[]).filter(
        (option) => option.name !== data.name || option.value !== data.value
      );
      return tx.optionSet.update({
        where: { id: data.optionSetID },
        data: { options },
      });
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

// ------------------------- SPECIFICATIONS -------------------------

export const getSpecGroupByCatID = async (categoryID: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!categoryID || categoryID === "") return { error: "Invalid Data!" };

  try {
    const result: TSpecGroup[] = await db.specGroup.findMany({
      where: {
        Category_SpecGroup: {
          some: {
            categoryID: categoryID,
          },
        },
      },
    });

    if (!result) return { error: "Not Found!" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

export const addSpecGroup = async (data: TSpecGroup) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!AddSpecGroup.safeParse(data).success) return { error: "Invalid Data" };

  try {
    const result = await db.category.update({
      where: {
        id: data.id,
      },
      data: {
        Category_SpecGroup: {
          create: {
            specGroup: {
              create: {
                title: data.title,
                specs: [],
              },
            },
          },
        },
      },
    });
    if (!result) return { error: "failed" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};
export const deleteSpecGroup = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id || id === "") return { error: "Invalid Data" };
  try {
    const result = await db.specGroup.delete({
      where: {
        id,
      },
    });
    if (!result) return { error: "failed" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};

// ------------------------- SINGLE SPEC -------------------------
export const addSingleSpec = async (data: TSingleSpec) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!SingleSpec.safeParse(data).success) return { error: "Invalid Data!" };
  try {
    const result = await db.specGroup.update({
      where: {
        id: data.specGroupID,
      },
      data: {
        specs: {
          push: data.value,
        },
      },
    });
    if (!result) return { error: "Can't Insert!" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};
export const deleteSingleSpec = async (data: TSingleSpec) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!SingleSpec.safeParse(data).success) return { error: "Invalid Data!" };
  try {
    const specsList = await db.specGroup.findFirst({
      where: {
        id: data.specGroupID,
      },
      select: {
        specs: true,
      },
    });
    if (!specsList || !specsList.specs) return { error: "Can't fins Item!" };

    const filteredList = specsList.specs.filter((spec) => spec !== data.value);

    const result = await db.specGroup.update({
      where: {
        id: data.specGroupID,
      },
      data: {
        specs: {
          set: filteredList,
        },
      },
    });
    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch {
    return { error: "Something went wrong, please try again" };
  }
};
