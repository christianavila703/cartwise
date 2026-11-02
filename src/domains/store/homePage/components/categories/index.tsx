import { getStoreCategoriesSafe } from "@/shared/lib/storeData";

import CategoryListItem from "./catListItem";

/** The homepage category menu, rendered on the server from the cached category tree. */
export const HomeCategoryList = async () => {
  const categories = await getStoreCategoriesSafe();

  return (
    <div className="min-w-[256px] absolute h-[500px] hidden lg:block bg-white mr-4 rounded-xl px-6 text-gray-800 shadow-md z-[3]">
      <ul className="mt-3">
        {categories.map((item, index) => (
          <CategoryListItem
            key={item.group.id}
            categoryData={item}
            className={index === categories.length - 1 ? "border-b-0" : ""}
          />
        ))}
      </ul>
    </div>
  );
};

