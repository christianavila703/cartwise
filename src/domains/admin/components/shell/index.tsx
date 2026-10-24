"use client";

import {
  BarChart3,
  ChevronDown,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/utils/styling";

import { AdminButton } from "../ui/button";
import { Avatar } from "../ui/misc";
import { ToastProvider } from "../ui/toast";

type TNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** only active on this exact path */
  exact?: boolean;
  /** path prefix that marks the item active, when it differs from href */
  match?: string;
};

const NAV_SECTIONS: { title: string; items: TNavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Brands", href: "/admin/brands", icon: Tags },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Traffic", href: "/admin/trafficView/1", match: "/admin/trafficView", icon: BarChart3 },
      { label: "Users", href: "/admin/users", icon: Users },
    ],
  },
];

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

const isActive = (pathname: string, item: TNavItem) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.match ?? item.href);

const Wordmark = () => (
  <Link href="/admin" className="flex items-center gap-2.5 px-2">
    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/50">
      <ShoppingCart className="size-[18px] text-white" strokeWidth={2.25} />
    </span>
    <span className="text-xl font-bold tracking-tight">
      <span className="text-white">Cart</span>
      <span className="text-brand-400">Wise</span>
    </span>
  </Link>
);

const SidebarContent = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => (
  <div className="flex h-full flex-col">
    <div className="flex h-16 items-center px-4">
      <Wordmark />
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-brand-600/25 to-brand-600/5 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    )}
                  >
                    {active && (
                      <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400 shadow-[0_0_12px_var(--color-brand-400)]" />
                    )}
                    <Icon
                      className={cn(
                        "size-[18px] transition-colors",
                        active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
    <div className="m-3 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/20 via-white/5 to-transparent p-4">
      <p className="text-sm font-semibold text-white">Your storefront</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">See your changes the way customers do.</p>
      <Link
        href="/"
        target="_blank"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200"
      >
        Open store <ExternalLink className="size-3.5" />
      </Link>
    </div>
  </div>
);

const UserMenu = ({ name, email }: { name: string; email: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition-colors hover:bg-slate-100"
      >
        <Avatar name={name || email} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium text-slate-800">{name || "Admin"}</span>
          <span className="block text-xs leading-tight text-slate-500">Administrator</span>
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-30 mt-2 w-64 animate-admin-scale overflow-hidden rounded-xl bg-white shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{name || "Admin"}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ShoppingCart className="size-4 text-slate-400" /> Back to store
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type TProps = {
  user: { name: string; email: string };
  children: ReactNode;
};

export const AdminShell = ({ user, children }: TProps) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => isActive(pathname, item));

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
        {/* desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] bg-[#0b1120] bg-[radial-gradient(120%_60%_at_0%_0%,rgba(19,102,214,0.22),transparent_60%)] lg:block">
          <SidebarContent pathname={pathname} />
        </aside>

        {/* mobile sidebar */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 animate-admin-fade bg-slate-950/50"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <aside className="relative h-full w-[264px] animate-admin-fade bg-[#0b1120]">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="absolute top-4 -right-12 flex size-9 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <SidebarContent pathname={pathname} onNavigate={() => setIsMobileNavOpen(false)} />
            </aside>
          </div>
        )}

        <div className="lg:pl-[264px]">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-8">
            <AdminButton
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </AdminButton>
            <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
              <Link href="/admin" className="text-slate-500 transition-colors hover:text-slate-800">
                Admin
              </Link>
              {current && current.href !== "/admin" && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="truncate font-medium text-slate-900">{current.label}</span>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 sm:inline-flex"
              >
                <ExternalLink className="size-4 text-slate-400" /> View store
              </Link>
              <UserMenu name={user.name} email={user.email} />
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
};
