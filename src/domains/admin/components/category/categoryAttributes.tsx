"use client";

import { ListChecks, Palette, Plus, SlidersHorizontal, Trash2, Type, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  addOptionSet,
  addSingleOption,
  addSingleSpec,
  addSpecGroup,
  deleteOptionSet,
  deleteSingleOption,
  deleteSingleSpec,
  deleteSpecGroup,
  getOptionSetByCatID,
  getSpecGroupByCatID,
} from "@/actions/category/categoryOptions";
import { TOptionSet, TSpecGroup } from "@/shared/types/common";
import { cn } from "@/shared/utils/styling";

import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { AdminInput } from "../ui/field";
import { EmptyState, Skeleton } from "../ui/misc";
import { ConfirmDialog, Modal } from "../ui/overlay";
import { useToast } from "../ui/toast";

type TResult = { error?: string; res?: unknown };

type TProps = {
  categoryID: string;
  categoryName: string;
  onClose: () => void;
};

export const CategoryAttributes = ({ categoryID, categoryName, onClose }: TProps) => {
  const toast = useToast();
  const [tab, setTab] = useState<"specs" | "options">("specs");
  const [optionSets, setOptionSets] = useState<TOptionSet[] | null>(null);
  const [specGroups, setSpecGroups] = useState<TSpecGroup[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionType, setNewOptionType] = useState<"TEXT" | "COLOR">("TEXT");
  const [pendingDelete, setPendingDelete] = useState<{ label: string; run: () => Promise<TResult> } | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const [optionsResponse, specsResponse] = await Promise.all([
        getOptionSetByCatID(categoryID),
        getSpecGroupByCatID(categoryID),
      ]);
      if (ignore) return;
      setOptionSets(optionsResponse.res ?? []);
      setSpecGroups(specsResponse.res ?? []);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [categoryID, reloadKey]);

  const run = async (action: () => Promise<TResult>, success?: string) => {
    setBusy(true);
    const response = await action();
    setBusy(false);
    if (response.error) {
      toast.error(response.error);
      return false;
    }
    if (success) toast.success(success);
    setReloadKey((key) => key + 1);
    return true;
  };

  const handleAddSpecGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (newTitle.trim().length < 3) {
      toast.error("Group title must be at least 3 characters");
      return;
    }
    if (await run(() => addSpecGroup({ id: categoryID, title: newTitle.trim(), specs: [] }), "Spec group added")) {
      setNewTitle("");
    }
  };

  const handleAddOptionSet = async (event: FormEvent) => {
    event.preventDefault();
    if (newOptionName.trim().length < 3) {
      toast.error("Option name must be at least 3 characters");
      return;
    }
    const added = await run(
      () => addOptionSet({ id: categoryID, name: newOptionName.trim(), options: [], type: newOptionType }),
      "Option set added"
    );
    if (added) setNewOptionName("");
  };

  return (
    <Modal
      title={categoryName}
      description="Specifications fill the product page table. Options describe variants such as color or storage."
      size="xl"
      onClose={onClose}
    >
      <div className="mb-5 flex w-fit gap-1 rounded-xl bg-slate-100/80 p-1">
        {[
          { key: "specs" as const, label: "Specifications", icon: ListChecks, count: specGroups?.length },
          { key: "options" as const, label: "Options", icon: SlidersHorizontal, count: optionSets?.length },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
              tab === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <item.icon className="size-4" /> {item.label}
            {item.count !== undefined && (
              <span className="rounded-md bg-slate-200/70 px-1.5 text-xs text-slate-600">{item.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "specs" ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl bg-brand-50/70 px-4 py-3 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">
            Sub categories inherit these groups, so products further down the tree get these fields too.
          </p>
          <form onSubmit={handleAddSpecGroup} className="flex gap-2">
            <AdminInput
              placeholder="New spec group, e.g. Battery"
              value={newTitle}
              onChange={(e) => setNewTitle(e.currentTarget.value)}
            />
            <AdminButton type="submit" variant="primary" disabled={busy || !newTitle.trim()}>
              <Plus className="size-4" /> Add group
            </AdminButton>
          </form>
          {specGroups === null ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : specGroups.length === 0 ? (
            <EmptyState icon={ListChecks} title="No specification groups" className="py-8" />
          ) : (
            specGroups.map((group) => (
              <SpecGroupCard
                key={group.id}
                group={group}
                busy={busy}
                onAddSpec={(value) => run(() => addSingleSpec({ specGroupID: group.id, value }))}
                onRemoveSpec={(value) => run(() => deleteSingleSpec({ specGroupID: group.id, value }))}
                onDelete={() =>
                  setPendingDelete({ label: `the "${group.title}" group`, run: () => deleteSpecGroup(group.id) })
                }
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAddOptionSet} className="flex flex-col gap-2 sm:flex-row">
            <AdminInput
              placeholder="New option, e.g. Color"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.currentTarget.value)}
            />
            <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
              {(["TEXT", "COLOR"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewOptionType(type)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all",
                    newOptionType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  )}
                >
                  {type === "TEXT" ? <Type className="size-3.5" /> : <Palette className="size-3.5" />}
                  {type === "TEXT" ? "Text" : "Color"}
                </button>
              ))}
            </div>
            <AdminButton type="submit" variant="primary" disabled={busy || !newOptionName.trim()}>
              <Plus className="size-4" /> Add option
            </AdminButton>
          </form>
          {optionSets === null ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : optionSets.length === 0 ? (
            <EmptyState icon={SlidersHorizontal} title="No options for this category" className="py-8" />
          ) : (
            optionSets.map((optionSet) => (
              <OptionSetCard
                key={optionSet.id}
                optionSet={optionSet}
                busy={busy}
                onAdd={(name, value) => run(() => addSingleOption({ optionSetID: optionSet.id, name, value }))}
                onRemove={(name, value) => run(() => deleteSingleOption({ optionSetID: optionSet.id, name, value }))}
                onDelete={() =>
                  setPendingDelete({ label: `the "${optionSet.name}" option`, run: () => deleteOptionSet(optionSet.id) })
                }
              />
            ))
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete?"
          message={`This removes ${pendingDelete.label} from every category that uses it.`}
          isLoading={busy}
          onConfirm={async () => {
            if (await run(pendingDelete.run, "Deleted")) setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </Modal>
  );
};

type TSpecGroupCardProps = {
  group: TSpecGroup;
  busy: boolean;
  onAddSpec: (value: string) => Promise<boolean>;
  onRemoveSpec: (value: string) => void;
  onDelete: () => void;
};

const SpecGroupCard = ({ group, busy, onAddSpec, onRemoveSpec, onDelete }: TSpecGroupCardProps) => {
  const [value, setValue] = useState("");

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (value.trim().length < 3) return;
    if (await onAddSpec(value.trim())) setValue("");
  };

  return (
    <div className="rounded-2xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-900">{group.title}</p>
        <AdminButton
          variant="ghost"
          size="sm"
          className="hover:bg-rose-50 hover:text-rose-600"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="size-3.5" /> Delete group
        </AdminButton>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {group.specs.length ? (
            group.specs.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 py-1 pr-1 pl-2.5 text-sm text-slate-700"
              >
                {spec}
                <button
                  type="button"
                  aria-label={`Remove ${spec}`}
                  disabled={busy}
                  onClick={() => onRemoveSpec(spec)}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">No fields yet</span>
          )}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <AdminInput
            placeholder="Add a field, e.g. Battery life"
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            className="h-9"
          />
          <AdminButton type="submit" size="sm" className="h-9" disabled={busy || value.trim().length < 3}>
            <Plus className="size-3.5" /> Add
          </AdminButton>
        </form>
      </div>
    </div>
  );
};

type TOptionSetCardProps = {
  optionSet: TOptionSet;
  busy: boolean;
  onAdd: (name: string, value: string) => Promise<boolean>;
  onRemove: (name: string, value: string) => void;
  onDelete: () => void;
};

const OptionSetCard = ({ optionSet, busy, onAdd, onRemove, onDelete }: TOptionSetCardProps) => {
  const isColor = optionSet.type === "COLOR";
  const [name, setName] = useState("");
  const [value, setValue] = useState(isColor ? "#1366d6" : "");

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const optionValue = isColor ? value : value || name;
    if (name.trim().length < 3 || optionValue.trim().length < 3) return;
    if (await onAdd(name.trim(), optionValue.trim())) {
      setName("");
      if (!isColor) setValue("");
    }
  };

  return (
    <div className="rounded-2xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900">{optionSet.name}</p>
          <Badge tone={isColor ? "violet" : "neutral"}>{isColor ? "Color" : "Text"}</Badge>
        </div>
        <AdminButton
          variant="ghost"
          size="sm"
          className="hover:bg-rose-50 hover:text-rose-600"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="size-3.5" /> Delete option
        </AdminButton>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {optionSet.options.length ? (
            optionSet.options.map((option) => (
              <span
                key={`${option.name}-${option.value}`}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 py-1 pr-1 pl-2 text-sm text-slate-700"
              >
                {isColor && (
                  <span
                    className="size-4 rounded-full ring-1 ring-slate-300 ring-inset"
                    style={{ backgroundColor: option.value }}
                  />
                )}
                {option.name}
                {!isColor && option.value !== option.name && (
                  <span className="text-xs text-slate-400">{option.value}</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${option.name}`}
                  disabled={busy}
                  onClick={() => onRemove(option.name, option.value)}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">No values yet</span>
          )}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <AdminInput
            placeholder={isColor ? "Color name, e.g. Midnight" : "Value, e.g. 256GB"}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            className="h-9"
          />
          {isColor ? (
            <input
              type="color"
              aria-label="Color"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            />
          ) : (
            <AdminInput
              placeholder="Code (optional)"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              className="h-9 sm:w-40"
            />
          )}
          <AdminButton type="submit" size="sm" className="h-9" disabled={busy || name.trim().length < 3}>
            <Plus className="size-3.5" /> Add
          </AdminButton>
        </form>
      </div>
    </div>
  );
};
