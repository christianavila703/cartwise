"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SearchBox } from "./searchBox";

const SyncedSearchBox = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // on the results page, show the current query in the navbar
  const query = pathname === "/search" ? (searchParams.get("q") ?? "") : "";
  return <SearchBox key={query} defaultValue={query} className={className} />;
};

/** The navbar search box. Suspense keeps static pages prerenderable while reading the URL. */
export const NavbarSearch = ({ className }: { className?: string }) => (
  <Suspense fallback={<SearchBox className={className} />}>
    <SyncedSearchBox className={className} />
  </Suspense>
);
