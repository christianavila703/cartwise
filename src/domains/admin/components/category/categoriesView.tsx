"use client";

import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownRight,
  FolderTree,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  deleteCategory,
  getAllCategories,
  getCategoryProductCounts,
  TGetAllCategories,
} from "@/actions/category/category";
import { cn } from "@/shared/utils/styling";

import { formatNumber } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { Card } from "../ui/card";
import { SearchInput } from "../ui/field";
import { EmptyState, PageHeader, Skeleton } from "../ui/misc";
import { ConfirmDialog } from "../ui/overlay";
import { useToast } from "../ui/toast";

import { CategoryAttributes } from "./categoryAttributes";
import { CategoryFormModal } from "./categoryFormModal";

type TNode = TGetAllCategories & { children: TNode[]; ownProducts: number; totalProducts: number };

type TDialog =
  | { type: "form"; category?: TGetAllCategories; parent?: { id: string; name: string } | null }
  | { type: "attributes"; category: TGetAllCategories }
  | { type: "delete"; node: TNode };

const buildTree = (categories: TGetAllCategories[], counts: Record<string, number>) => {
  const build = (parentID: string | null): TNode[] =>
    categories
      .filter((category) => category.parentID === parentID)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => {
        const children = build(category.id);
        const ownProducts = counts[category.id] ?? 0;
        return {
          ...category,
          children,
          ownProducts,
          totalProducts: ownProducts + children.reduce((sum, child) => sum + child.totalProducts, 0),
        };
      });
  return build(null);
};

const matches = (node: TNode, query: string): boolean =>
  node.name.toLowerCase().includes(query) || node.children.some((child) => matches(child, query));

export const CategoriesView = () => {
  const toast = useToast();
  const [categories, setCategories] = useState<TGetAllCategories[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<TDialog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const [categoriesResponse, countsResponse] = await Promise.all([getAllCategories(), getCategoryProductCounts()]);
      if (ignore) return;
      if (categoriesResponse.res) setCategories(categoriesResponse.res);
      else toast.error(categoriesResponse.error ?? "Can't load categories");
      if (countsResponse.res) setCounts(countsResponse.res);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const reload = () => setReloadKey((key) => key + 1);
  const tree = useMemo(() => (categories ? buildTree(categories, counts) : null), [categories, counts]);
  const query = search.trim().toLowerCase();
  const visibleTree = tree?.filter((node) => !query || matches(node, query)) ?? null;

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allIDs = (categories ?? []).map((category) => category.id);
  const isAllCollapsed = allIDs.length > 0 && allIDs.every((id) => collapsed.has(id));

  const handleDelete = async (node: TNode) => {
    setIsDeleting(true);
    const response = await deleteCategory(node.id);
    setIsDeleting(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(`${node.name} was deleted`);
    setDialog(null);
    reload();
  };

  const renderRow = (node: TNode, depth: number) => {
    const isOpen = !!query || !collapsed.has(node.id);
    const hasChildren = node.children.length > 0;
    const visibleChildren = query ? node.children.filter((child) => matches(child, query)) : node.children;

    return (
      <li key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-3 rounded-xl py-2.5 pr-2 transition-colors hover:bg-slate-50",
            depth === 1 ? "pl-3" : "pl-10"
          )}
        >
          {depth === 1 ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              disabled={!hasChildren}
              aria-label={isOpen ? "Collapse" : "Expand"}
              className="flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 disabled:invisible"
            >
              <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
            </button>
          ) : (
            <CornerDownRight className="size-4 text-slate-300" />
          )}
          <div className="min-w-0 flex-1">
            <span className="font-medium text-slate-800">{node.name}</span>
            <span className="ml-2 font-mono text-xs text-slate-400">/{node.url}</span>
          </div>
          <Badge tone={node.totalProducts ? "brand" : "neutral"}>
            {node.totalProducts} product{node.totalProducts === 1 ? "" : "s"}
          </Badge>
          <div className="flex gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
            {depth === 1 && (
              <AdminButton
                variant="ghost"
                size="icon"
                title="Add sub category"
                aria-label={`Add sub category to ${node.name}`}
                onClick={() => setDialog({ type: "form", parent: { id: node.id, name: node.name } })}
              >
                <Plus className="size-4" />
              </AdminButton>
            )}
            <AdminButton
              variant="ghost"
              size="icon"
              title="Specifications & options"
              aria-label={`Specifications and options of ${node.name}`}
              onClick={() => setDialog({ type: "attributes", category: node })}
            >
              <ListChecks className="size-4" />
            </AdminButton>
            <AdminButton
              variant="ghost"
              size="icon"
              title="Edit"
              aria-label={`Edit ${node.name}`}
              onClick={() => setDialog({ type: "form", category: node })}
            >
              <Pencil className="size-4" />
            </AdminButton>
            <AdminButton
              variant="ghost"
              size="icon"
              title="Delete"
              aria-label={`Delete ${node.name}`}
              className="hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setDialog({ type: "delete", node })}
            >
              <Trash2 className="size-4" />
            </AdminButton>
          </div>
        </div>
        {hasChildren && isOpen && (
          <ul className={cn(depth === 1 && "ml-6 border-l border-dashed border-slate-200")}>
            {visibleChildren.map((child) => renderRow(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const deleteNode = dialog?.type === "delete" ? dialog.node : null;
  const deleteBlocker = deleteNode
    ? deleteNode.children.length
      ? `${deleteNode.name} has ${deleteNode.children.length} sub categor${deleteNode.children.length === 1 ? "y" : "ies"}. Delete those first.`
      : deleteNode.ownProducts
        ? `${deleteNode.name} has ${deleteNode.ownProducts} product${deleteNode.ownProducts === 1 ? "" : "s"}. Move or delete them first.`
        : null
    : null;

  return (
    <>
      <PageHeader
        title="Categories"
        description={
          categories
            ? `${tree?.length ?? 0} groups · ${formatNumber(categories.length)} categories in total`
            : "Organize how products are grouped in the store."
        }
        actions={
          <>
            <AdminButton onClick={() => setCollapsed(isAllCollapsed ? new Set() : new Set(allIDs))}>
              {isAllCollapsed ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
              {isAllCollapsed ? "Expand all" : "Collapse all"}
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setDialog({ type: "form", parent: null })}>
              <Plus className="size-4" /> New group
            </AdminButton>
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search categories…" value={search} onValueChange={setSearch} />
      </div>

      {visibleTree === null ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : visibleTree.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderTree}
            title={tree?.length ? "No categories match your search" : "No categories yet"}
            description={tree?.length ? undefined : "Create a group, then add categories inside it."}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {visibleTree.map((group) => {
            const visibleChildren = query ? group.children.filter((child) => matches(child, query)) : group.children;
            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="flex items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                    {group.iconUrl && (
                      <Image
                        src={`/icons/${group.iconUrl}.svg`}
                        alt=""
                        width={group.iconSize[0] || 16}
                        height={group.iconSize[1] || 16}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">/list/{group.url}</span> · {group.children.length} categor
                      {group.children.length === 1 ? "y" : "ies"} · {group.totalProducts} product
                      {group.totalProducts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    <AdminButton
                      variant="ghost"
                      size="icon"
                      title="Specifications & options"
                      aria-label={`Specifications and options of ${group.name}`}
                      onClick={() => setDialog({ type: "attributes", category: group })}
                    >
                      <ListChecks className="size-4" />
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      size="icon"
                      title="Edit group"
                      aria-label={`Edit ${group.name}`}
                      onClick={() => setDialog({ type: "form", category: group })}
                    >
                      <Pencil className="size-4" />
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      size="icon"
                      title="Delete group"
                      aria-label={`Delete ${group.name}`}
                      className="hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => setDialog({ type: "delete", node: group })}
                    >
                      <Trash2 className="size-4" />
                    </AdminButton>
                  </div>
                </div>
                <div className="p-2">
                  {visibleChildren.length ? (
                    <ul>{visibleChildren.map((child) => renderRow(child, 1))}</ul>
                  ) : (
                    <p className="px-4 py-5 text-center text-sm text-slate-400">No categories in this group yet</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setDialog({ type: "form", parent: { id: group.id, name: group.name } })}
                    className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700"
                  >
                    <Plus className="size-4" /> Add category to {group.name}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {dialog?.type === "form" && (
        <CategoryFormModal
          category={dialog.category}
          parent={dialog.parent}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      )}

      {dialog?.type === "attributes" && (
        <CategoryAttributes
          categoryID={dialog.category.id}
          categoryName={dialog.category.name}
          onClose={() => setDialog(null)}
        />
      )}

      {deleteNode && (
        <ConfirmDialog
          title={deleteBlocker ? "Can't delete yet" : `Delete ${deleteNode.name}?`}
          message={deleteBlocker ?? "This category will be removed from the store menu. This can't be undone."}
          confirmText={deleteBlocker ? "Got it" : "Delete"}
          tone={deleteBlocker ? "primary" : "danger"}
          isLoading={isDeleting}
          onConfirm={deleteBlocker ? () => setDialog(null) : () => handleDelete(deleteNode)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
};
