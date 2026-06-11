import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppState } from "../lib/store";
import { requireAuth, requireHousehold } from "../lib/auth/requireAuth";

export const Route = createFileRoute("/history")({
  beforeLoad: async () => {
    await requireAuth();
    await requireHousehold();
  },
  head: () => ({
    meta: [
      { title: "היסטוריה — רשימת קניות" },
      { name: "description", content: "צפו ברשימות הקניות הקודמות שלכם." },
    ],
  }),
  component: History,
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function History() {
  const { state, getProduct, deleteList, replaceSelectedItems } = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const lists = useMemo(
    () =>
      [...state.shoppingLists]
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, 10),
    [state.shoppingLists],
  );

  if (lists.length === 0) {
    return (
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">היסטוריה</h1>
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            עדיין לא סיימת רשימות. כשתסיים קנייה — היא תופיע כאן.
          </p>
          <Link
            to="/workspace"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            לרשימה שלי
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">היסטוריה</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lists.length} רשימות אחרונות
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {lists.map((list) => {
          const totalItems = list.items.reduce((s, i) => s + i.quantity, 0);
          const isOpen = openId === list.id;
          return (
            <li
              key={list.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : list.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-right transition-colors hover:bg-accent/40"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {formatDate(list.savedAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {list.items.length} מוצרים · {totalItems} פריטים
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isOpen ? "סגור" : "פתח"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-background/40 px-4 py-3">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {list.items.map((item) => {
                      const product = getProduct(item.productId);
                      return (
                        <li
                          key={item.productId}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm"
                        >
                          <span>{product?.name ?? "מוצר לא ידוע"}</span>
                          <span className="text-xs text-muted-foreground">
                            ×{item.quantity}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (
                          state.selectedItems.length === 0 ||
                          confirm("הפעולה תחליף את הרשימה הנוכחית. להמשיך?")
                        ) {
                          replaceSelectedItems(list.items);
                          navigate({ to: "/workspace" });
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      השתמש שוב ברשימה
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("למחוק את הרשימה הזו?")) {
                          deleteList(list.id);
                          setOpenId(null);
                        }
                      }}
                      className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      מחיקה
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
