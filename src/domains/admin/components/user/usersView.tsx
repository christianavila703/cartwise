"use client";

import { Role } from "@prisma/client";
import { ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { deleteUser, getUsers, setUserRole } from "@/actions/admin/users";
import { TAdminUser } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { formatDate, formatNumber } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { Card, StatCard } from "../ui/card";
import { AdminSelect, SearchInput } from "../ui/field";
import { Avatar, EmptyState, PageHeader, Skeleton } from "../ui/misc";
import { ConfirmDialog } from "../ui/overlay";
import { useToast } from "../ui/toast";

type TRoleChange = { user: TAdminUser; role: Role };

export const UsersView = () => {
  const toast = useToast();
  const [users, setUsers] = useState<TAdminUser[] | null>(null);
  const [currentUserID, setCurrentUserID] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [roleChange, setRoleChange] = useState<TRoleChange | null>(null);
  const [toDelete, setToDelete] = useState<TAdminUser | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const response = await getUsers();
      if (ignore) return;
      if (response.res) {
        setUsers(response.res.users);
        setCurrentUserID(response.res.currentUserID);
      } else {
        toast.error(response.error ?? "Can't load users");
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const reload = () => setReloadKey((key) => key + 1);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users ?? []).filter(
      (user) =>
        (!roleFilter || user.role === roleFilter) &&
        `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(query)
    );
  }, [users, search, roleFilter]);

  const adminCount = (users ?? []).filter((user) => user.role === "ADMIN").length;

  const handleRoleChange = async () => {
    if (!roleChange) return;
    setIsWorking(true);
    const response = await setUserRole(roleChange.user.id, roleChange.role);
    setIsWorking(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(
      `${roleChange.user.name || roleChange.user.email} is now ${roleChange.role === "ADMIN" ? "an admin" : "a customer"}`
    );
    setRoleChange(null);
    reload();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsWorking(true);
    const response = await deleteUser(toDelete.id);
    setIsWorking(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(`${toDelete.name || toDelete.email} was deleted`);
    setToDelete(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Users" description="Customer accounts and who can access this dashboard." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total accounts" value={users ? formatNumber(users.length) : "—"} icon={Users} tone="brand" />
        <StatCard
          label="Customers"
          value={users ? formatNumber(users.length - adminCount) : "—"}
          icon={UserRound}
          tone="emerald"
        />
        <StatCard label="Admins" value={users ? formatNumber(adminCount) : "—"} icon={ShieldCheck} tone="violet" />
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px] sm:p-5">
          <SearchInput placeholder="Search by name or email…" value={search} onValueChange={setSearch} />
          <AdminSelect value={roleFilter} onChange={(e) => setRoleFilter(e.currentTarget.value as "" | Role)}>
            <option value="">All roles</option>
            <option value="USER">Customers</option>
            <option value="ADMIN">Admins</option>
          </AdminSelect>
        </div>

        {users === null ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : visibleUsers.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => {
                  const isSelf = user.id === currentUserID;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name || user.email || "?"} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-medium text-slate-900">
                              {user.name || "Unnamed"}
                              {isSelf && <Badge tone="brand">You</Badge>}
                            </p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div
                          className={cn(
                            "inline-flex rounded-lg bg-slate-100 p-0.5",
                            isSelf && "pointer-events-none opacity-60"
                          )}
                          title={isSelf ? "You can't change your own role" : undefined}
                        >
                          {(["USER", "ADMIN"] as const).map((role) => (
                            <button
                              key={role}
                              type="button"
                              disabled={isSelf || user.role === role}
                              onClick={() => setRoleChange({ user, role })}
                              className={cn(
                                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                                user.role === role
                                  ? role === "ADMIN"
                                    ? "bg-white text-violet-700 shadow-sm"
                                    : "bg-white text-slate-800 shadow-sm"
                                  : "cursor-pointer text-slate-500 hover:text-slate-800"
                              )}
                            >
                              {role === "ADMIN" ? "Admin" : "Customer"}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <AdminButton
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            title={isSelf ? "You can't delete your own account" : "Delete user"}
                            aria-label={`Delete ${user.email}`}
                            className="hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setToDelete(user)}
                          >
                            <Trash2 className="size-4" />
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {roleChange && (
        <ConfirmDialog
          title={roleChange.role === "ADMIN" ? "Make admin?" : "Remove admin access?"}
          message={
            roleChange.role === "ADMIN" ? (
              <>
                <span className="font-medium text-slate-900">{roleChange.user.email}</span> will be able to manage
                products, categories, brands, traffic and users.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{roleChange.user.email}</span> will lose access to this
                dashboard immediately.
              </>
            )
          }
          confirmText={roleChange.role === "ADMIN" ? "Make admin" : "Remove access"}
          tone={roleChange.role === "ADMIN" ? "primary" : "danger"}
          isLoading={isWorking}
          onConfirm={handleRoleChange}
          onClose={() => setRoleChange(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete user?"
          message={
            <>
              The account <span className="font-medium text-slate-900">{toDelete.email}</span> will be permanently
              deleted.
            </>
          }
          isLoading={isWorking}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
};
