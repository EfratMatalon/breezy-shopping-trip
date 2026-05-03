import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Minus, X, Search, ChevronDown, ShoppingCart } from "lucide-react";
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORY_ORDER.map((c, i) => [c, i === 0])),
  );

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
      setOpenCategories((s) => ({ ...s, "מוצרי יסוד": true }));
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
    setOpenCategories((s) => ({ ...s, [c]: !s[c] }));

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

      {/* Categories */}
      <div className="mt-4 space-y-2">
        {CATEGORY_ORDER.map((category) => {
          const products = productsByCategory.get(category) ?? [];
          if (isSearching && products.length === 0) return null;
          const isOpen = isSearching ? true : !!openCategories[category];
          const selectedInCat = products.reduce(
            (sum, p) => sum + (quantityFor(p.id) > 0 ? 1 : 0),
            0,
          );
          return (
            <div
              key={category}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-4 py-3 text-right hover:bg-accent/50"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {products.length} מוצרים
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInCat > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {selectedInCat}
                    </span>
                  )}
                  <span className="text-sm font-semibold">{category}</span>
                </div>
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-3">
                  {products.length === 0 ? (
                    <p className="col-span-full text-center text-xs text-muted-foreground">
                      אין מוצרים בקטגוריה זו
                    </p>
                  ) : (
                    products.map((p) => {
                      const qty = quantityFor(p.id);
                      const isSelected = qty > 0;
                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => addSelectedItem(p.id, 1)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              addSelectedItem(p.id, 1);
                            }
                          }}
                          className={`group flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:border-primary/60 hover:shadow-sm ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background hover:bg-accent/40"
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
                                onClick={() =>
                                  updateSelectedQuantity(p.id, qty - 1)
                                }
                                className="rounded-md p-1 text-muted-foreground hover:bg-background"
                                aria-label="הפחתה"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-[1.25rem] text-center text-sm font-semibold text-primary">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => addSelectedItem(p.id, 1)}
                                className="rounded-md bg-primary p-1 text-primary-foreground hover:bg-primary/90"
                                aria-label="הוספה"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className="rounded-md bg-primary/10 p-1.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
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
              )}
            </div>
          );
        })}
      </div>

      {/* Selected summary */}
      {state.selectedItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                ברשימה: {state.selectedItems.length} מוצרים ({totalCount} פריטים)
              </span>
              <button
                onClick={finishList}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                סיום ושמירה
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.selectedItems.map((it) => {
                const p = productById.get(it.productId);
                if (!p) return null;
                return (
                  <span
                    key={it.productId}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                  >
                    {p.name} × {it.quantity}
                    <button
                      type="button"
                      onClick={() => removeSelectedItem(it.productId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`הסר ${p.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
