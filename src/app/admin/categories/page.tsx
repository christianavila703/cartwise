"use client";

import { useEffect, useState } from "react";

import { TGetAllCategories, getAllCategories } from "@/actions/category/category";
import AddCategoryGroup from "@/domains/admin/components/category/addCategoryGroup";
import CatGroupRow from "@/domains/admin/components/category/rowGroup";

const AdminCategories = () => {
  const [allCategories, setAllCategories] = useState<TGetAllCategories[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const getData = async () => {
      const data = await getAllCategories();
      if (data.res && !ignore) setAllCategories(data.res);
    };
    getData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const reloadData = () => setReloadKey((key) => key + 1);

  const groups: TGetAllCategories[] = [];
  const categories: TGetAllCategories[] = [];

  if (allCategories.length > 0) {
    allCategories.forEach((cat) => {
      if (cat.parentID) {
        categories.push(cat);
        return;
      }

      groups.push(cat);
    });
  }
  return (
    <div className="flex flex-col">
      <div className="w-full mt-3 flex gap-4 items-center">
        <h3 className="text-xl font-light text-gray-600">Add a main group:</h3>
        <AddCategoryGroup onReset={reloadData} />
      </div>
      <div className="mt-6">
        {groups.length > 0 &&
          groups.map((group) => (
            <div className="mb-8 rounded-lg border border-gray-200" key={group.id}>
              <CatGroupRow onReset={reloadData} data={group} categories={categories} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default AdminCategories;
