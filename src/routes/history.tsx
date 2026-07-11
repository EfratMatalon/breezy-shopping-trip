import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requireAuth, requireHousehold } from "../lib/auth/requireAuth";
import { useMyHousehold } from "../lib/household/useMyHousehold";
import { queryKeys } from "../lib/queries/queryKeys";
import { fetchCompletedLists } from "../lib/queries/lists";
import { getProductImagePath } from "../lib/imageHelpers";

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

function formatDate(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function History() {
  const { household } = useMyHousehold();
  const householdId = household?.id;
  const [openId, setOpenId] = useState<string | null>(null);

  const listsQuery = useQuery({
    queryKey: queryKeys.completedLists(householdId),
    queryFn: () => fetchCompletedLists(householdId!),
    enabled: !!householdId,
  });

  if (listsQuery.isLoading) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm" style={{ color: "#5F6368" }}>טוען היסטוריה…</p>
      </section>
    );
  }

  const lists = listsQuery.data ?? [];

  if (lists.length === 0) {
    return (
      <section>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "#202124" }}>היסטוריה</h1>
        <div className="mt-10 rounded-2xl p-12 text-center" style={{ border: "1.5px dashed #E0E0DE", background: "#FAFAF8" }}>
          <p className="text-sm" style={{ color: "#5F6368" }}>
            עדיין לא סיימת רשימות. כשתסיים קנייה — היא תופיע כאן.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#202124" }}>היסטוריה</h1>
        <p className="mt-1 text-sm" style={{ color: "#5F6368" }}>{lists.length} רשימות אחרונות</p>
      </div>

      <ul className="flex flex-col gap-3">
        {lists.map((list) => {
          const isOpen = openId === list.id;
          const items = list.shopping_items ?? [];
          const notes = list.shopping_notes ?? [];
          const purchased = items.filter((i) => i.status === "purchased");
          const unavailable = items.filter((i) => i.status === "unavailable");
          const pending = items.filter((i) => i.status === "pending");
          const totalQty = items.reduce((s, i) => s + i.quantity, 0);

          return (
            <li key={list.id} className="overflow-hidden rounded-2xl bg-white"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : list.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-[#FAFAF8]"
              >
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-sm font-bold" style={{ color: "#202124" }}>
                    {formatDate(list.completed_at)}
                  </span>
                  <span className="text-xs" style={{ color: "#5F6368" }}>
                    {items.length} מוצרים · {totalQty} פריטים
                    {notes.length > 0 && ` · ${notes.length} הערות`}
                  </span>
                  <div className="flex gap-2 mt-1">
                    {purchased.length > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: "#EEF8F0", color: "#4CAF50" }}>✓ {purchased.length} נקנו</span>
                    )}
                    {unavailable.length > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: "#FFF5F5", color: "#C0756F" }}>😕 {unavailable.length} לא נמצאו</span>
                    )}
                    {pending.length > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: "#F5F5F3", color: "#5F6368" }}>{pending.length} לא סומנו</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium" style={{ color: "#7B4FAF" }}>
                  {isOpen ? "סגור ▲" : "פתח ▼"}
                </span>
              </button>

              {isOpen && (
                <div style={{ borderTop: "1px solid #F0EEEA" }}>
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {items.length === 0 && notes.length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: "#5F6368" }}>הרשימה ריקה</p>
                    )}

                    {/* ── Reminders ── */}
                    {notes.length > 0 && (
                      <div>
                        <div className="text-xs font-bold mb-2" style={{ color: "#7B5E00" }}>💡 תזכורות</div>
                        <div className="flex flex-col gap-1.5">
                          {notes.map((n) => (
                            <div key={`note-${n.id}`} className="rounded-xl px-3 py-2.5"
                              style={{ background: "#FFFDE7", border: "1.5px solid #F9E44E" }}>
                              <div className="text-sm" style={{ color: "#4E342E", whiteSpace: "pre-wrap" }}>{n.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Items ── */}
                    {items.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {items.map((item) => {
                          const isPurchased = item.status === "purchased";
                          const isUnavailable = item.status === "unavailable";
                          const imgSrc = getProductImagePath(item.products?.category_id, item.products?.image);

                          if (isPurchased) {
                            return (
                              <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                                style={{ background: "#EEF8F0" }}>
                                {imgSrc && (
                                  <img src={imgSrc} alt={item.products?.name ?? ""} loading="lazy" decoding="async"
                                    className="shrink-0 rounded-lg object-cover" style={{ width: 36, height: 36 }} />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium line-through" style={{ color: "#9E9E9E" }}>
                                    {item.products?.name ?? "מוצר לא ידוע"}
                                  </div>
                                  <div className="text-xs font-medium" style={{ color: "#4CAF50" }}>✓ נקנה</div>
                                </div>
                                <span className="shrink-0 text-xs" style={{ color: "#9E9E9E" }}>×{item.quantity}</span>
                              </div>
                            );
                          }

                          if (isUnavailable) {
                            return (
                              <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                                style={{ background: "#FFF5F5", border: "1.5px solid #EFCFCF" }}>
                                {imgSrc && (
                                  <img src={imgSrc} alt={item.products?.name ?? ""} loading="lazy" decoding="async"
                                    className="shrink-0 rounded-lg object-cover" style={{ width: 36, height: 36 }} />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium" style={{ color: "#C0756F" }}>
                                    {item.products?.name ?? "מוצר לא ידוע"}
                                  </div>
                                  <div className="text-xs font-medium" style={{ color: "#C0756F" }}>😕 לא נמצא</div>
                                </div>
                                <span className="shrink-0 text-xs" style={{ color: "#C0756F" }}>×{item.quantity}</span>
                              </div>
                            );
                          }

                          return (
                            <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                              style={{ background: "#FAFAF8" }}>
                              {imgSrc && (
                                <img src={imgSrc} alt={item.products?.name ?? ""} loading="lazy" decoding="async"
                                  className="shrink-0 rounded-lg object-cover" style={{ width: 36, height: 36 }} />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium" style={{ color: "#202124" }}>
                                  {item.products?.name ?? "מוצר לא ידוע"}
                                </div>
                              </div>
                              <span className="shrink-0 text-xs" style={{ color: "#5F6368" }}>×{item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
