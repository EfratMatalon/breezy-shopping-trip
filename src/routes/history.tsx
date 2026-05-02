import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadHistory, saveHistory, type ShoppingList } from "../lib/shopping";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — ShopList" },
      { name: "description", content: "Review your previously saved shopping lists." },
    ],
  }),
  component: History,
});

function History() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLists(loadHistory());
    setHydrated(true);
  }, []);

  const remove = (id: string) => {
    const next = lists.filter((l) => l.id !== id);
    setLists(next);
    saveHistory(next);
  };

  const clearAll = () => {
    if (!confirm("Delete all history?")) return;
    setLists([]);
    saveHistory([]);
  };

  if (!hydrated) return null;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lists.length === 0
              ? "No saved lists yet."
              : `${lists.length} saved list${lists.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {lists.length > 0 && (
          <button
            onClick={clearAll}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Clear all
          </button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="mt-16 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Finish a list in the workspace to see it here.
          </p>
          <Link
            to="/workspace"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Workspace
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {lists.map((list) => {
            const done = list.items.filter((i) => i.done).length;
            return (
              <li key={list.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">{list.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(list.savedAt).toLocaleString()} · {done}/{list.items.length}{" "}
                      completed
                    </p>
                  </div>
                  <button
                    onClick={() => remove(list.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Delete
                  </button>
                </div>
                <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                  {list.items.map((item) => (
                    <li
                      key={item.id}
                      className={`text-sm ${
                        item.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      • {item.name}{" "}
                      <span className="text-xs text-muted-foreground">×{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
