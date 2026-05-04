import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

const CATEGORY_TINTS: Record<string, { bg: string; grad: string; icon: string }> = {
  "פירות":           { bg: "var(--cat-fruits)",     grad: "var(--cat-grad-fruits)",     icon: "🍎" },
  "ירקות":           { bg: "var(--cat-vegetables)", grad: "var(--cat-grad-vegetables)", icon: "🥬" },
  "מוצרי חלב":       { bg: "var(--cat-dairy)",      grad: "var(--cat-grad-dairy)",      icon: "🥛" },
  "מאפים":           { bg: "var(--cat-bakery)",     grad: "var(--cat-grad-bakery)",     icon: "🍞" },
  "בשר ודגים":       { bg: "var(--cat-meat)",       grad: "var(--cat-grad-meat)",       icon: "🍗" },
  "קפואים":          { bg: "var(--cat-frozen)",     grad: "var(--cat-grad-frozen)",     icon: "🧊" },
  "שתייה":           { bg: "var(--cat-drinks)",     grad: "var(--cat-grad-drinks)",     icon: "🥤" },
  "חטיפים ומתוקים":  { bg: "var(--cat-snacks)",     grad: "var(--cat-grad-snacks)",     icon: "🍫" },
  "ניקיון":          { bg: "var(--cat-cleaning)",   grad: "var(--cat-grad-cleaning)",   icon: "🧼" },
  "מוצרי יסוד":      { bg: "var(--cat-basics)",     grad: "var(--cat-grad-basics)",     icon: "🛒" },
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
    dismissSuggestion,
  } = useAppState();

  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [bumpedId, setBumpedId] = useState<string | null>(null);
  const [finishedCount, setFinishedCount] = useState<number | null>(null);
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

  // Smart suggestions: products that appeared 2+ times in past lists,
  // not currently selected, and not dismissed. Max 2 per category.
  // Only shown after the user has added at least one item to the current list
  // (so it feels like a reminder, not a static list on entry).
  const suggestionsByCategory = useMemo(() => {
    const byCat = new Map<string, Product[]>();
    CATEGORY_ORDER.forEach((c) => byCat.set(c, []));
    if (state.selectedItems.length === 0) return byCat;
    if (state.shoppingLists.length === 0) return byCat;

    const counts = new Map<string, number>();
    state.shoppingLists.forEach((list) => {
      const seen = new Set<string>();
      list.items.forEach((it) => {
        if (seen.has(it.productId)) return;
        seen.add(it.productId);
        counts.set(it.productId, (counts.get(it.productId) ?? 0) + 1);
      });
    });
    const selectedIds = new Set(state.selectedItems.map((i) => i.productId));
    const dismissed = new Set(state.dismissedSuggestions);
    Array.from(counts.entries())
      .filter(([id, n]) => n >= 2 && !selectedIds.has(id) && !dismissed.has(id))
      .sort((a, b) => b[1] - a[1])
      .forEach(([id]) => {
        const p = productById.get(id);
        if (!p) return;
        const key = p.category && byCat.has(p.category) ? p.category : "מוצרי יסוד";
        const arr = byCat.get(key)!;
        if (arr.length < 2) arr.push(p);
      });
    return byCat;
  }, [state.shoppingLists, state.selectedItems, state.dismissedSuggestions, productById]);

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
    const count = state.selectedItems.reduce((s, i) => s + i.quantity, 0);
    saveCurrentList();
    startNewCycle();
    setCartOpen(false);
    setOpenCategory(CATEGORY_ORDER[0] ?? null);
    setQuery("");
    setFinishedCount(count);
    setTimeout(() => {
      setFinishedCount(null);
      navigate({ to: "/" });
    }, 1600);
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
              style={{ background: tint?.grad ?? tint?.bg }}
              aria-expanded={isOpen}
              className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 active:scale-[0.97] ${
                isOpen
                  ? "border-primary/50 shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--primary)_45%,transparent)] ring-2 ring-primary/30"
                  : "border-white/60 shadow-[0_4px_14px_-6px_oklch(0.4_0.05_270/0.18)]"
              }`}
            >
              {selectedInCat > 0 && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-md">
                  {selectedInCat}
                </span>
              )}
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-base shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              >
                {tint?.icon ?? "🛒"}
              </span>
              <span className="text-[13px] font-semibold leading-tight text-foreground/90">{category}</span>
              <span className="text-[10px] text-foreground/50">
                {products.length} מוצרים
              </span>
            </button>
          );
        };

        const renderExpansion = (category: string) => {
          const products = productsByCategory.get(category) ?? [];
          const tint = CATEGORY_TINTS[category];
          const suggestions = isSearching ? [] : (suggestionsByCategory.get(category) ?? []);
          return (
            <div
              key={`${category}-panel`}
              style={{ animation: "expand 0.25s ease-out" }}
              className="col-span-2 overflow-hidden rounded-2xl border border-white/60 bg-card shadow-[0_8px_24px_-12px_oklch(0.4_0.05_270/0.25)] sm:col-span-3"
            >
              <div
                style={{ background: tint?.grad ?? tint?.bg }}
                className="flex items-center justify-between px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="rounded-full p-1 text-foreground/60 transition-all hover:bg-white/60 hover:text-foreground active:scale-90"
                  aria-label="סגור קטגוריה"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground/90">{category}</span>
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm shadow-sm ring-1 ring-white/70 backdrop-blur-sm"
                    aria-hidden
                  >
                    {tint?.icon ?? "🛒"}
                  </span>
                </div>
              </div>
              {suggestions.length > 0 && (
                <div
                  className="border-t border-border/60 px-3 py-2.5"
                  style={{ backgroundColor: tint ? `color-mix(in oklab, ${tint.bg} 35%, var(--card))` : undefined }}
                >
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>בדרך כלל אתה קונה את זה</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((p) => (
                      <div
                        key={`sugg-${p.id}`}
                        className="group flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-background/80 py-1 pl-1 pr-3 text-xs shadow-sm transition-all hover:border-primary hover:bg-background"
                      >
                        <button
                          type="button"
                          onClick={() => handleAdd(p.id)}
                          className="font-medium text-foreground"
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(p.id)}
                          className="rounded-full bg-primary p-0.5 text-primary-foreground transition-transform hover:scale-110"
                          aria-label="הוספה"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(p.id)}
                          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="התעלמות"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div
                className="flex flex-wrap gap-1.5 border-t border-border px-2.5 py-2"
                style={{ backgroundColor: tint ? `color-mix(in oklab, ${tint.bg} 55%, var(--card))` : undefined }}
              >
                {products.length === 0 ? (
                  <p className="w-full text-center text-xs text-muted-foreground">
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
                        className={`group inline-flex cursor-pointer items-center gap-1 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-all duration-200 hover:shadow-sm active:scale-95 ${
                          isSelected
                            ? "border-primary/40 bg-[var(--primary-soft)] ring-1 ring-primary/30"
                            : "border-border bg-background/85 hover:border-primary/40 hover:bg-background"
                        }`}
                      >
                        <span className="font-medium">{p.name}</span>
                        {isSelected ? (
                          <div
                            className="flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, qty - 1)}
                              className="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-background active:scale-90"
                              aria-label="הפחתה"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span
                              key={qty}
                              style={{ animation: "pop 0.25s ease-out" }}
                              className="min-w-[0.9rem] text-center text-[11px] font-semibold text-primary"
                            >
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdd(p.id)}
                              className="rounded-full bg-primary p-0.5 text-primary-foreground transition-all hover:bg-primary/90 active:scale-90"
                              aria-label="הוספה"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="rounded-full bg-primary/10 p-0.5 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground"
                            aria-hidden
                          >
                            <Plus className="h-3 w-3" />
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
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] px-5 py-3 text-sm font-medium text-primary-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--primary)_50%,transparent)] transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
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
              onClick={finishList}
              className="w-full rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] px-4 py-3 text-base font-bold text-primary-foreground shadow-[0_10px_24px_-10px_color-mix(in_oklab,var(--primary)_50%,transparent)] transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.97]"
            >
              ✓ סיימתי קניות
            </button>
          </div>
        )}
      </aside>

      {finishedCount !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ animation: "expand 0.2s ease-out" }}
        >
          <div className="mx-4 flex flex-col items-center gap-2 rounded-2xl bg-card px-8 py-6 text-center shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground shadow-lg">
              ✓
            </div>
            <h3 className="text-lg font-bold">הקנייה נשמרה!</h3>
            <p className="text-sm text-muted-foreground">
              {finishedCount} פריטים נוספו להיסטוריה
            </p>
            <p className="text-xs text-muted-foreground">מתחילים רשימה חדשה…</p>
          </div>
        </div>
      )}
    </section>
  );
}
