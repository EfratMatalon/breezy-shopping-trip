import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, X, Search, ShoppingCart, Sparkles } from "lucide-react";
import { useAppState, CATEGORY_ORDER, type Product } from "../lib/store";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "רשימת קניות" },
      { name: "description", content: "בחרו מוצרים לפי קטגוריות והוסיפו לרשימה." },
    ],
  }),
  component: Workspace,
});

const CATEGORY_TINTS: Record<string, { bg: string; icon: string }> = {
  "פירות":           { bg: "var(--cat-fruits)",     icon: "🍎" },
  "ירקות":           { bg: "var(--cat-vegetables)", icon: "🥬" },
  "מוצרי חלב":       { bg: "var(--cat-dairy)",      icon: "🥛" },
  "מאפים":           { bg: "var(--cat-bakery)",     icon: "🍞" },
  "בשר ודגים":       { bg: "var(--cat-meat)",       icon: "🍗" },
  "קפואים":          { bg: "var(--cat-frozen)",     icon: "🧊" },
  "שתייה":           { bg: "var(--cat-drinks)",     icon: "🥤" },
  "חטיפים ומתוקים":  { bg: "var(--cat-snacks)",     icon: "🍫" },
  "ניקיון":          { bg: "var(--cat-cleaning)",   icon: "🧼" },
  "מוצרי יסוד":      { bg: "var(--cat-basics)",     icon: "🛒" },
};

function Workspace() {
  const {
    state,
    addSelectedItem,
    updateSelectedQuantity,
    removeSelectedItem,
    addUserProduct,
    saveCurrentList,
    startNewCycle,
  } = useAppState();

  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [bumpedId, setBumpedId] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(
    CATEGORY_ORDER[0] ?? null,
  );
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setColumns(mq.matches ? 3 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const bump = (id: string) => {
    setBumpedId(id);
    setTimeout(() => setBumpedId((curr) => (curr === id ? null : curr)), 350);
  };
  const handleAdd = (id: string) => {
    addSelectedItem(id, 1);
    bump(id);
  };
  const handleQtyChange = (id: string, qty: number) => {
    updateSelectedQuantity(id, qty);
    bump(id);
  };

  const allProducts = useMemo<Product[]>(
    () => [...state.systemCatalog, ...state.userProducts],
    [state.systemCatalog, state.userProducts],
  );

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    allProducts.forEach((p) => m.set(p.id, p));
    return m;
  }, [allProducts]);

  const productsByCategory = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? allProducts.filter((p) => p.name.includes(q))
      : allProducts;
    const map = new Map<string, Product[]>();
    CATEGORY_ORDER.forEach((c) => map.set(c, []));
    filtered.forEach((p) => {
      const key = p.category && map.has(p.category) ? p.category : "מוצרי יסוד";
      map.get(key)!.push(p);
    });
    return map;
  }, [allProducts, query]);

  const quantityFor = (productId: string) =>
    state.selectedItems.find((i) => i.productId === productId)?.quantity ?? 0;

  const exactMatch = allProducts.find((p) => p.name === query.trim());

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = query.trim();
    if (!name) return;
    if (exactMatch) {
      addSelectedItem(exactMatch.id, 1);
    } else {
      const product = addUserProduct(name, "מוצרי יסוד");
      addSelectedItem(product.id, 1);
      setOpenCategory("מוצרי יסוד");
    }
    setQuery("");
  };

  const totalCount = state.selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const finishList = () => {
    if (state.selectedItems.length === 0) return;
    saveCurrentList();
    startNewCycle();
  };

  const toggleCategory = (c: string) =>
    setOpenCategory((curr) => (curr === c ? null : c));

  const isSearching = query.trim().length > 0;

  return (
    <section className="pb-32">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">רשימת קניות</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          בחרו מוצרים מתוך הקטגוריות
        </p>
      </div>

      {/* Quick add */}
      <form
        onSubmit={handleQuickAdd}
        className="sticky top-2 z-10 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש או הוספה מהירה…"
            className="w-full rounded-md border border-input bg-background py-2 pr-9 pl-3 text-sm outline-none focus:border-ring"
          />
        </div>
      </form>

      {/* Categories grid with inline expansion */}
      {(() => {
        const visibleCategories = CATEGORY_ORDER.filter((c) => {
          const products = productsByCategory.get(c) ?? [];
          return !(isSearching && products.length === 0);
        });

        const openIndex = isSearching
          ? -1
          : openCategory
            ? visibleCategories.indexOf(openCategory)
            : -1;

        const rowEndIndex =
          openIndex >= 0
            ? Math.min(
                visibleCategories.length - 1,
                openIndex + (columns - 1 - (openIndex % columns)),
              )
            : -1;

        const renderCategoryCard = (category: string) => {
          const products = productsByCategory.get(category) ?? [];
          const isOpen = isSearching ? true : openCategory === category;
          const selectedInCat = products.reduce(
            (sum, p) => sum + (quantityFor(p.id) > 0 ? 1 : 0),
            0,
          );
          const tint = CATEGORY_TINTS[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              style={{ backgroundColor: tint?.bg }}
              aria-expanded={isOpen}
              className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                isOpen ? "border-primary/50 ring-2 ring-primary/30" : "border-border/70"
              }`}
            >
              {selectedInCat > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                  {selectedInCat}
                </span>
              )}
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/70 text-2xl shadow-sm ring-1 ring-border/50"
                aria-hidden
              >
                {tint?.icon ?? "🛒"}
              </span>
              <span className="text-sm font-semibold leading-tight">{category}</span>
              <span className="text-[11px] text-muted-foreground">
                {products.length} מוצרים
              </span>
            </button>
          );
        };

        const renderExpansion = (category: string) => {
          const products = productsByCategory.get(category) ?? [];
          const tint = CATEGORY_TINTS[category];
          return (
            <div
              key={`${category}-panel`}
              style={{ animation: "expand 0.25s ease-out" }}
              className="col-span-2 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:col-span-3"
            >
              <div
                style={{ backgroundColor: tint?.bg }}
                className="flex items-center justify-between px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60"
                  aria-label="סגור קטגוריה"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold">{category}</span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/70 text-lg shadow-sm ring-1 ring-border/50"
                    aria-hidden
                  >
                    {tint?.icon ?? "🛒"}
                  </span>
                </div>
              </div>
              <div
                className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-3"
                style={{ backgroundColor: tint ? `color-mix(in oklab, ${tint.bg} 55%, var(--card))` : undefined }}
              >
                {products.length === 0 ? (
                  <p className="col-span-full text-center text-xs text-muted-foreground">
                    אין מוצרים בקטגוריה זו
                  </p>
                ) : (
                  products.map((p) => {
                    const qty = quantityFor(p.id);
                    const isSelected = qty > 0;
                    const isBumped = bumpedId === p.id;
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleAdd(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleAdd(p.id);
                          }
                        }}
                        style={isBumped ? { animation: "bump 0.35s ease-out" } : undefined}
                        className={`group flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                          isSelected
                            ? "border-primary/40 bg-[var(--primary-soft)] ring-1 ring-primary/30"
                            : "border-border bg-background/85 hover:border-primary/40 hover:bg-background"
                        }`}
                      >
                        <span className="flex-1 truncate text-right font-medium">
                          {p.name}
                        </span>
                        {isSelected ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, qty - 1)}
                              className="rounded-md p-1 text-muted-foreground transition-all hover:bg-background hover:scale-110 active:scale-95"
                              aria-label="הפחתה"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span
                              key={qty}
                              style={{ animation: "pop 0.25s ease-out" }}
                              className="min-w-[1.25rem] text-center text-sm font-semibold text-primary"
                            >
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdd(p.id)}
                              className="rounded-md bg-primary p-1 text-primary-foreground transition-all hover:bg-primary/90 hover:scale-110 active:scale-95"
                              aria-label="הוספה"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="rounded-md bg-primary/10 p-1.5 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"
                            aria-hidden
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        };

        const nodes: React.ReactNode[] = [];
        visibleCategories.forEach((category, idx) => {
          nodes.push(renderCategoryCard(category));
          if (idx === rowEndIndex && openCategory) {
            nodes.push(renderExpansion(openCategory));
          }
        });

        return (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {nodes}
            {isSearching &&
              visibleCategories.map((c) => renderExpansion(c))}
          </div>
        );
      })()}
      {/* Floating cart toggle */}
      {!cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="הצג רשימה"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>הרשימה שלי</span>
          {state.selectedItems.length > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">
              {totalCount}
            </span>
          )}
        </button>
      )}

      {/* Side cart overlay */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={() => setCartOpen(false)}
          aria-hidden
        />
      )}

      {/* Side cart panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!cartOpen}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">הרשימה שלי</h2>
            <span className="text-xs text-muted-foreground">
              ({state.selectedItems.length} מוצרים)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="סגירת הרשימה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {state.selectedItems.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              הרשימה ריקה — בחרו מוצרים מהקטגוריות
            </p>
          ) : (
            <ul className="divide-y divide-border/60 space-y-3">
              {state.selectedItems.map((it) => {
                const p = productById.get(it.productId);
                if (!p) return null;
                return (
                  <li
                    key={it.productId}
                    className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2.5 shadow-sm transition-colors hover:bg-accent/30"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.category && (
                        <div className="text-xs text-muted-foreground">
                          {p.category}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleQtyChange(it.productId, it.quantity - 1)
                        }
                        className="rounded-md p-1 text-muted-foreground transition-all hover:bg-accent hover:scale-110 active:scale-95"
                        aria-label="הפחתה"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span
                        key={it.quantity}
                        style={{ animation: "pop 0.25s ease-out" }}
                        className="min-w-[1.5rem] text-center text-sm font-semibold"
                      >
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdd(it.productId)}
                        className="rounded-md bg-primary p-1 text-primary-foreground transition-all hover:bg-primary/90 hover:scale-110 active:scale-95"
                        aria-label="הוספה"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedItem(it.productId)}
                      className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                      aria-label={`הסר ${p.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {state.selectedItems.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">סה״כ פריטים</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <button
              onClick={() => {
                finishList();
                setCartOpen(false);
              }}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
            >
              ✓ סיימתי קניות
            </button>
          </div>
        )}
      </aside>
    </section>
  );
}
