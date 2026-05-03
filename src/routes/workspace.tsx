import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Minus, X, Search } from "lucide-react";
import { useAppState, type Product } from "../lib/store";

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

  const allProducts = useMemo<Product[]>(
    () => [...state.systemCatalog, ...state.userProducts],
    [state.systemCatalog, state.userProducts],
  );

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    allProducts.forEach((p) => m.set(p.id, p));
    return m;
  }, [allProducts]);

  const grouped = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? allProducts.filter((p) => p.name.includes(q))
      : allProducts;
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const key = p.category ?? "אחר";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries());
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
      const product = addUserProduct(name, "שלי");
      addSelectedItem(product.id, 1);
    }
    setQuery("");
  };

  const totalCount = state.selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const finishList = () => {
    if (state.selectedItems.length === 0) return;
    saveCurrentList();
    startNewCycle();
  };

  return (
    <section className="pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">רשימת קניות</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          בחרו מוצרים לפי קטגוריה או חפשו במהירות
        </p>
      </div>

      {/* Quick add */}
      <form
        onSubmit={handleQuickAdd}
        className="sticky top-2 z-10 flex gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש או הוספה מהירה…"
            className="w-full rounded-md border border-input bg-background py-2 pr-9 pl-3 text-sm outline-none focus:border-ring"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {exactMatch ? "הוספה" : "הוספה חדשה"}
        </button>
      </form>

      {/* Categories */}
      <div className="mt-6 space-y-6">
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground">לא נמצאו מוצרים תואמים.</p>
        )}
        {grouped.map(([category, products]) => (
          <div key={category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {category}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {products.map((p) => {
                const qty = quantityFor(p.id);
                const isSelected = qty > 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-colors ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => addSelectedItem(p.id, 1)}
                      className="flex-1 text-right text-sm"
                    >
                      {p.name}
                    </button>
                    {isSelected ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedQuantity(p.id, qty - 1)
                          }
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                          aria-label="הפחתה"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-sm font-medium">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addSelectedItem(p.id, 1)}
                          className="rounded-md p-1 text-primary hover:bg-accent"
                          aria-label="הוספה"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addSelectedItem(p.id, 1)}
                        className="rounded-md bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
                        aria-label={`הוסף ${p.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
