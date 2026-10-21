"use client";
import { useEffect, useRef, useState } from "react";

import { addBrand, deleteBrand, getAllBrands, updateBrand } from "@/actions/brands/brands";
import Button from "@/shared/components/UI/button";
import Input from "@/shared/components/UI/input";
import Popup from "@/shared/components/UI/popup";
import { TBrand } from "@/shared/types";

const Brand = () => {
  const selectedBrandID = useRef("");
  const [addValue, setAddValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [brandList, setBrandList] = useState<TBrand[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const fetchBrands = async () => {
      const response = await getAllBrands();

      if (response.res && !ignore) {
        setIsListLoading(false);
        setBrandList(response.res);
      }
    };
    fetchBrands();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const reloadBrands = () => setReloadKey((key) => key + 1);

  const handleAdd = async () => {
    if (addValue !== "") {
      setIsLoading(true);
      const response = await addBrand(addValue);
      if (response.error) {
        setIsLoading(false);
      }
      if (response.res) {
        setIsLoading(false);
        setAddValue("");
        reloadBrands();
      }
    }
  };

  const handleShowEdit = (data: TBrand) => {
    selectedBrandID.current = data.id;
    setEditValue(data.name);
    setErrorMsg("");
    setShowEdit(true);
  };
  const handleUpdate = async () => {
    if (selectedBrandID.current !== "" && editValue !== "") {
      setIsLoading(true);
      const response = await updateBrand({
        id: selectedBrandID.current,
        name: editValue,
      });
      if (response.error) {
        setIsLoading(false);
        setErrorMsg(response.error);
      }
      if (response.res) {
        setIsLoading(false);
        setShowEdit(false);
        reloadBrands();
      }
    }
  };

  const handleShowDelete = (id: string) => {
    selectedBrandID.current = id;
    setShowDelete(true);
  };
  const handleDelete = async () => {
    if (selectedBrandID.current !== "") {
      setIsLoading(true);
      const response = await deleteBrand(selectedBrandID.current);
      if (response.error) {
        setIsLoading(false);
      }
      if (response.res) {
        setIsLoading(false);
        setShowDelete(false);
        reloadBrands();
      }
    }
  };

  return (
    <div>
      <div className="flex gap-4 items-center">
        <Input
          type="text"
          className="w-[200px]"
          value={addValue}
          onChange={(e) => setAddValue(e.currentTarget.value)}
        />
        <Button disabled={isLoading} onClick={handleAdd}>
          Add New Brand
        </Button>
      </div>
      <div className="w-[500px] mt-10 text-sm text-gray-800">
        {isListLoading ? (
          <div>LOADING...</div>
        ) : (
          <div className="flex flex-col">
            {brandList.length === 0 && <div>There is No Brand!</div>}
            {brandList.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center p-1.5 pl-6 rounded-lg justify-between transition-colors duration-400 hover:bg-gray-100"
              >
                <span>{brand.name}</span>
                <div className="flex gap-4">
                  <Button onClick={() => handleShowEdit(brand)}>Edit</Button>
                  <Button onClick={() => handleShowDelete(brand.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showEdit && (
        <Popup
          width="400px"
          title="Edit Brand Name"
          content={
            <div className="flex flex-col gap-4 py-10 px-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Brand Name:</span>
                <Input
                  className="w-[200px]"
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.currentTarget.value)}
                />
              </div>
              <span>{errorMsg}</span>
            </div>
          }
          isLoading={isLoading}
          onCancel={() => setShowEdit(false)}
          onClose={() => setShowEdit(false)}
          onSubmit={() => handleUpdate()}
          cancelBtnText="No"
          confirmBtnText="Yes"
        />
      )}
      {showDelete && (
        <Popup
          width="300px"
          content={<div className="text-center py-3 pb-6">Are You Sure?</div>}
          isLoading={isLoading}
          onCancel={() => setShowDelete(false)}
          onClose={() => setShowDelete(false)}
          onSubmit={() => handleDelete()}
          cancelBtnText="No"
          confirmBtnText="Yes"
        />
      )}
    </div>
  );
};

export default Brand;
