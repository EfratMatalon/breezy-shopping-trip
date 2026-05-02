import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  loadCurrent,
  saveCurrent,
  loadHistory,
  saveHistory,
  type ShoppingItem,
} from "../lib/shopping";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — ShopList" },
      { name: "description", content: "Build and manage your active shopping list." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCurrent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCurrent(items);
  }, [items, hydrated]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, qty: Math.max(1, qty), done: false },
    ]);
    setName("");
    setQty(1);
  };

  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const clear = () => setItems([]);

  const finish = () => {
    if (items.length === 0) return;
    const listName = window.prompt("Name this shopping list:", new Date().toLocaleDateString());
    if (listName === null) return;
    const history = loadHistory();
    history.unshift({
      id: crypto.randomUUID(),
      name: listName.trim() || "Untitled",
      items,
      savedAt: Date.now(),
    });
    saveHistory(history);
    setItems([]);
  };

  const remaining = items.filter((i) => !i.done).length;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Shopping Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "Your list is empty. Add an item to begin."
              : `${remaining} of ${items.length} item${items.length === 1 ? "" : "s"} remaining`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={finish}
            disabled={items.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Finish & Save
          </button>
        </div>
      </div>

      <form
        onSubmit={addItem}
        className="mt-8 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Apples"
          className="flex-1 min-w-[180px] rounded-md bg-background px-3 py-2 text-sm outline-none border border-input focus:border-ring"
        />
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value) || 1)}
          className="w-20 rounded-md bg-background px-3 py-2 text-sm outline-none border border-input focus:border-ring"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
            <span
              className={`flex-1 text-sm ${
                item.done ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.name}
            </span>
            <span className="text-xs text-muted-foreground">×{item.qty}</span>
            <button
              onClick={() => remove(item.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
