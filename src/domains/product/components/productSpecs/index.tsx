"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { TSpecification } from "@/shared/types/product";

/** Collapsible specification groups. Rendered on the server; only the open/closed state lives in the browser. */
const ProductSpecs = ({ specifications }: { specifications: TSpecification[] }) => {
  // indexes of the groups the visitor collapsed
  const [collapsed, setCollapsed] = useState<number[]>([]);

  const toggle = (group: number) =>
    setCollapsed((current) => (current.includes(group) ? current.filter((item) => item !== group) : [...current, group]));

  return (
    <>
      {specifications.map((spec, index) => {
        const isOpen = !collapsed.includes(index);
        return (
          <section key={index} className="w-full py-5 border-b border-gray-300">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`spec-group-${index}`}
                onClick={() => toggle(index)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-md text-left text-gray-700 hover:text-gray-900"
              >
                <span className="flex size-8 items-center justify-center rounded-md transition-colors group-hover:bg-gray-100">
                  {isOpen ? <Minus className="size-4 text-gray-500" /> : <Plus className="size-4 text-gray-500" />}
                </span>
                {spec.groupName}
                {!isOpen && <span className="text-xs text-gray-400">{spec.specs.length} specs</span>}
              </button>
            </h3>
            <div id={`spec-group-${index}`} hidden={!isOpen}>
              {spec.specs.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="w-full pt-3 flex items-stretch bg-white text-sm rounded-lg hover:bg-gray-100"
                >
                  <div className="min-w-[160px] flex items-start ml-[42px] text-gray-500">
                    <span>{row.name}</span>
                  </div>
                  <div className="font-medium text-gray-800">
                    <span className="block leading-5 min-h-8 h-auto">{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

export default ProductSpecs;
