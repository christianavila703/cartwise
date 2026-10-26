"use client";

import { ArrowRight, Clock, FolderTree, Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";

import { getSearchSuggestions } from "@/actions/search/search";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { TSearchSuggestions } from "@/shared/types/search";
import { cn } from "@/shared/utils/styling";

const RECENT_KEY = "recentSearches";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 250;

const readRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const saveRecent = (query: string) => {
  try {
    const next = [query, ...readRecent().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage can be unavailable (private mode); recent searches are just a convenience
  }
};

const clearRecent = () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // nothing to clear when storage is unavailable
  }
};

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** Wraps the parts of `text` that match a search word in <mark>. */
const highlight = (text: string, query: string): ReactNode => {
  const terms = query.toLowerCase().split(" ").filter(Boolean);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    terms.includes(part.toLowerCase()) ? (
      <mark key={index} className="bg-transparent font-semibold text-gray-900">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

type TItem = { key: string; href: string; label: string; onSelect?: () => void };

type TProps = { className?: string; autoFocus?: boolean; defaultValue?: string };

export const SearchBox = ({ className, autoFocus, defaultValue = "" }: TProps) => {
  const router = useRouter();
  const listID = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TSearchSuggestions | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = value.replace(/\s+/g, " ").trim();

  // fetch suggestions shortly after the user stops typing; older responses are ignored
  useEffect(() => {
    if (query.length < 2) return;
    const requestID = ++requestRef.current;
    const timer = setTimeout(async () => {
      const response = await getSearchSuggestions(query);
      if (requestID !== requestRef.current) return;
      setSuggestions(response.res ?? null);
      setIsLoading(false);
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const goTo = (href: string, searchTerm?: string) => {
    if (searchTerm) saveRecent(searchTerm);
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;
  const showSuggestions = query.length >= 2 && suggestions?.query === query;

  // the flat, keyboard-navigable list of what is currently shown
  const items: TItem[] =
    query.length < 2
      ? recent.map((term) => ({ key: `recent-${term}`, href: searchHref(term), label: term }))
      : showSuggestions
        ? [
            ...(suggestions.didYouMean
              ? [{ key: "did-you-mean", href: searchHref(suggestions.didYouMean), label: suggestions.didYouMean }]
              : []),
            ...suggestions.categories.map((category) => ({ key: category.id, href: category.href, label: category.name })),
            ...suggestions.products.map((product) => ({
              key: product.id,
              href: `/product/${product.id}`,
              label: product.name,
            })),
            ...(suggestions.total > 0 ? [{ key: "all", href: searchHref(query), label: query }] : []),
          ]
        : [];

  const indexOf = (key: string) => items.findIndex((item) => item.key === key);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const active = items[activeIndex];
    if (active) {
      goTo(active.href, active.key.startsWith("recent-") || active.key === "all" ? active.label : query);
      return;
    }
    if (query) goTo(searchHref(query), query);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      if (!items.length) return;
      // -1 means the text field itself; moving past either end wraps around through it
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next >= items.length) return -1;
        if (next < -1) return items.length - 1;
        return next;
      });
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const optionClass = (key: string) =>
    cn(
      "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
      indexOf(key) === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
    );

  const showPanel = isOpen && (query.length >= 2 || recent.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form role="search" onSubmit={handleSubmit} className="relative h-full">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Search products, brands and categories"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listID}
          aria-activedescendant={activeIndex >= 0 && items[activeIndex] ? `${listID}-${activeIndex}` : undefined}
          className="size-full rounded-lg border border-gray-300 pr-10 pl-11 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-500 [&::-webkit-search-cancel-button]:hidden"
          onFocus={() => {
            setRecent(readRecent());
            setIsOpen(true);
          }}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setValue(next);
            setIsOpen(true);
            setActiveIndex(-1);
            // only show the spinner when a new request will actually be sent
            const nextQuery = next.replace(/\s+/g, " ").trim();
            setIsLoading(nextQuery.length >= 2 && nextQuery !== suggestions?.query);
          }}
          onKeyDown={handleKeyDown}
        />
        {isLoading ? (
          <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : (
          value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                setSuggestions(null);
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </form>

      {showPanel && (
        <div
          id={listID}
          role="listbox"
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-900/10"
        >
          {query.length < 2 ? (
            <>
              <div className="flex items-center justify-between px-3 pt-1 pb-2">
                <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">Recent searches</p>
                <button
                  type="button"
                  onClick={() => {
                    clearRecent();
                    setRecent([]);
                  }}
                  className="cursor-pointer text-xs text-gray-400 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              {recent.map((term) => {
                const key = `recent-${term}`;
                return (
                  <button
                    key={key}
                    id={`${listID}-${indexOf(key)}`}
                    role="option"
                    aria-selected={indexOf(key) === activeIndex}
                    type="button"
                    onClick={() => goTo(searchHref(term), term)}
                    className={optionClass(key)}
                  >
                    <Clock className="size-4 text-gray-400" />
                    <span className="text-gray-700">{term}</span>
                  </button>
                );
              })}
            </>
          ) : !showSuggestions ? (
            <div className="flex flex-col gap-2 p-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="size-10 animate-pulse rounded-lg bg-gray-100" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : suggestions.total === 0 && suggestions.categories.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-700">
                No results for <span className="font-semibold">“{query}”</span>
              </p>
              {suggestions.didYouMean ? (
                <button
                  type="button"
                  id={`${listID}-${indexOf("did-you-mean")}`}
                  role="option"
                  aria-selected={indexOf("did-you-mean") === activeIndex}
                  onClick={() => goTo(searchHref(suggestions.didYouMean!), suggestions.didYouMean!)}
                  className={cn(
                    "mt-2 cursor-pointer rounded-md px-2 py-1 text-sm text-brand-600 hover:underline",
                    indexOf("did-you-mean") === activeIndex && "bg-gray-100"
                  )}
                >
                  Did you mean <span className="font-semibold">{suggestions.didYouMean}</span>?
                </button>
              ) : (
                <p className="mt-1 text-xs text-gray-500">Try a different word or check the spelling.</p>
              )}
            </div>
          ) : (
            <>
              {suggestions.categories.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 pt-1 pb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">Categories</p>
                  {suggestions.categories.map((category) => (
                    <Link
                      key={category.id}
                      id={`${listID}-${indexOf(category.id)}`}
                      role="option"
                      aria-selected={indexOf(category.id) === activeIndex}
                      href={category.href}
                      onClick={() => setIsOpen(false)}
                      className={optionClass(category.id)}
                    >
                      <FolderTree className="size-4 text-gray-400" />
                      <span className="text-gray-700">{highlight(category.name, query)}</span>
                      {category.parentNames.length > 0 && (
                        <span className="truncate text-xs text-gray-400">in {category.parentNames.join(" › ")}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.products.length > 0 && (
                <div>
                  <p className="px-3 pt-1 pb-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">Products</p>
                  {suggestions.products.map((product) => (
                    <Link
                      key={product.id}
                      id={`${listID}-${indexOf(product.id)}`}
                      role="option"
                      aria-selected={indexOf(product.id) === activeIndex}
                      href={`/product/${product.id}`}
                      onClick={() => {
                        saveRecent(query);
                        setIsOpen(false);
                      }}
                      className={optionClass(product.id)}
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {product.images[0] && (
                          <Image
                            src={IMAGE_BASE_URL + product.images[0]}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-gray-600">{highlight(product.name, query)}</span>
                        <span className="block text-xs text-gray-400">
                          {product.category === product.brand ? product.brand : `${product.brand} · ${product.category}`}
                        </span>
                      </span>
                      <span className="flex flex-col items-end">
                        <span className={cn("text-sm font-medium", product.salePrice ? "text-red-600" : "text-gray-800")}>
                          {euros.format(product.salePrice ?? product.price)}
                        </span>
                        {!product.isAvailable && <span className="text-[11px] text-gray-400">Out of stock</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.total > 0 && (
                <button
                  type="button"
                  id={`${listID}-${indexOf("all")}`}
                  role="option"
                  aria-selected={indexOf("all") === activeIndex}
                  onClick={() => goTo(searchHref(query), query)}
                  className={cn(
                    "mt-1 flex w-full cursor-pointer items-center justify-between rounded-lg border-t border-gray-100 px-3 py-2.5 text-sm font-medium text-brand-600",
                    indexOf("all") === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  See all {suggestions.total} result{suggestions.total === 1 ? "" : "s"} for “{query}”
                  <ArrowRight className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
