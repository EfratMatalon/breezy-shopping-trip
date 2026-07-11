import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback, useRef } from "react";
import { ShoppingCart, Search, X } from "lucide-react";
import { requireAuth, requireHousehold } from "../lib/auth/requireAuth";
import { useMyHousehold } from "../lib/household/useMyHousehold";
import { queryKeys } from "../lib/queries/queryKeys";
import { fetchActiveList, fetchListItems, type ShoppingItemWithProduct } from "../lib/queries/lists";
import { fetchProducts, type Product } from "../lib/queries/products";
import { fetchNotes, type ShoppingNote } from "../lib/queries/notes";
import { useSetItemQuantity, useMarkPurchased, useMarkPending, useMarkUnavailable } from "../lib/hooks/useCart";
import { useCompleteTrip } from "../lib/hooks/useCompleteTrip";
import { useAddNote, useUpdateNote, useDeleteNote } from "../lib/hooks/useNotes";
import { useShoppingItemsChannel } from "../lib/realtime/useShoppingItemsChannel";
import { useShoppingNotesChannel } from "../lib/realtime/useShoppingNotesChannel";
import { getCategoryImagePath, getProductImagePath } from "../lib/imageHelpers";
import { fetchCategories } from "../lib/queries/categories";

export const Route = createFileRoute("/workspace")({
  beforeLoad: async () => {
    await requireAuth();
    await requireHousehold();
  },
  head: () => ({
    meta: [
      { title: "רשימת קניות" },
      { name: "description", content: "צפו בפריטי הרשימה הפעילה לפי קטגוריות." },
    ],
  }),
  component: Workspace,
});

// ── Hebrew final-letter normalisation for search ──────────────────────────────
// Maps final form → base form so partial typing still matches.
const FINAL_MAP: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
function normalizeHebrew(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (c) => FINAL_MAP[c] ?? c);
}

function Workspace() {
  const { household } = useMyHousehold();
  const householdId = household?.id;

  const activeListQuery = useQuery({
    queryKey: queryKeys.activeList(householdId),
    queryFn: () => fetchActiveList(householdId!),
    enabled: !!householdId,
  });
  const listId = activeListQuery.data?.id;

  const itemsQuery = useQuery({
    queryKey: queryKeys.listItems(listId),
    queryFn: () => fetchListItems(listId!),
    enabled: !!listId,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.products(householdId),
    queryFn: () => fetchProducts(householdId!),
    enabled: !!householdId,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  });
  const notesQuery = useQuery({
    queryKey: queryKeys.notes(listId),
    queryFn: () => fetchNotes(listId!),
    enabled: !!listId,
  });

  const setItemQty     = useSetItemQuantity(listId, householdId);
  const markPurchased  = useMarkPurchased(listId, householdId);
  const markPending   = useMarkPending(listId, householdId);
  const markUnavailable = useMarkUnavailable(listId, householdId);
  const addNote       = useAddNote(listId);
  const updateNote    = useUpdateNote(listId);
  const deleteNote    = useDeleteNote(listId);

  useShoppingItemsChannel(listId, householdId);
  useShoppingNotesChannel(listId);

  const completeTrip = useCompleteTrip(householdId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [openCategory, setOpenCategory]           = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId]     = useState<string | null>(null);
  const [showCompleteTripDialog, setShowCompleteTripDialog] = useState(false);
  const [completeTripToast, setCompleteTripToast] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [carryPendingChoice, setCarryPendingChoice] = useState(false);
  const [tripError, setTripError]                 = useState<string | null>(null);
  const [successToastMsg, setSuccessToastMsg]     = useState<string | null>(null);

  // ── Per-product quantity (category panel "planning" stage) ───────────────
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});
  // If user hasn't touched the stepper, show the current list qty (for products already in list), else 1.
  const getProductQty = (id: string) =>
    id in productQtys ? productQtys[id] : (itemsByProductId.get(id)?.quantity ?? 1);
  const bumpProductQty = (id: string, delta: number) => {
    const current = getProductQty(id);
    const inList  = itemsByProductId.has(id);
    setProductQtys((prev) => ({ ...prev, [id]: Math.max(inList ? 0 : 1, current + delta) }));
  };
  const resetProductQty = (id: string) =>
    setProductQtys((prev) => { const next = { ...prev }; delete next[id]; return next; });

  // ── Per-product success flash ─────────────────────────────────────────────
  const [productSuccess, setProductSuccess] = useState<Record<string, "added" | "updated">>({});
  const showProductSuccess = (id: string, kind: "added" | "updated") => {
    setProductSuccess((prev) => ({ ...prev, [id]: kind }));
    setTimeout(() => setProductSuccess((prev) => { const n = { ...prev }; delete n[id]; return n; }), 1600);
  };

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Notes state ───────────────────────────────────────────────────────────
  const [showNoteDialog, setShowNoteDialog]   = useState(false);
  const [editingNote, setEditingNote]         = useState<ShoppingNote | null>(null);
  const [noteTitle, setNoteTitle]             = useState("");
  const [noteBody, setNoteBody]               = useState("");
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [remindersOpen, setRemindersOpen]             = useState(true);

  // ── Data ──────────────────────────────────────────────────────────────────
  const items: ShoppingItemWithProduct[] = itemsQuery.data ?? [];
  const products: Product[]              = productsQuery.data ?? [];
  const categories                       = categoriesQuery.data ?? [];
  const notes: ShoppingNote[]            = notesQuery.data ?? [];

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((p) => {
      if (!p.category_id) return;
      const arr = map.get(p.category_id) ?? [];
      arr.push(p);
      map.set(p.category_id, arr);
    });
    return map;
  }, [products]);

  const itemsByProductId = useMemo(() => {
    const m = new Map<string, ShoppingItemWithProduct>();
    items.forEach((i) => m.set(i.product_id, i));
    return m;
  }, [items]);

  // ── Category name lookup (slug → display_name_he) ────────────────────────
  const categoryNameBySlugs = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.slug, c.display_name_he));
    return m;
  }, [categories]);

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = normalizeHebrew(searchQuery.trim());
    if (!q) return null;
    const scored = products
      .filter((p) => {
        const n = normalizeHebrew(p.name);
        return n.includes(q);
      })
      .map((p) => {
        const n = normalizeHebrew(p.name);
        const score = n === q ? 0 : n.startsWith(q) ? 1 : 2;
        return { p, score };
      });
    scored.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name, "he"));
    return scored.map((x) => x.p);
  }, [searchQuery, products]);

  const isSearchActive = searchResults !== null;

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const toggleCategory = (c: string) => setOpenCategory((curr) => (curr === c ? null : c));

  // ── Complete trip logic (unchanged) ──────────────────────────────────────
  const fireRpc = useCallback(
    (carryPending: boolean, carryUnavailable: boolean) => {
      if (!listId || !householdId) return;
      setTripError(null);
      completeTrip.mutate(
        { activeListId: listId, carryPending, carryUnavailable },
        {
          onSuccess: () => {
            const msg = carryUnavailable
              ? "הקניות הסתיימו בהצלחה! רשימה חדשה נוצרה והמוצרים שלא נמצאו הועברו אליה."
              : "הקניות הסתיימו בהצלחה! רשימת קניות חדשה נוצרה.";
            setSuccessToastMsg(msg);
            setCompleteTripToast(true);
            setTimeout(() => { setCompleteTripToast(false); setSuccessToastMsg(null); }, 4000);
          },
          onError: (err) => {
            setTripError(err instanceof Error ? err.message : "שגיאה בסיום הרשימה");
            setCompleteTripToast(true);
            setTimeout(() => { setCompleteTripToast(false); setTripError(null); }, 4000);
          },
        },
      );
    },
    [listId, householdId, completeTrip],
  );

  const handleCompleteShoppingTrip = useCallback(() => {
    setShowCompleteTripDialog(false);
    const hasPending = items.some((i) => i.status === "pending");
    if (hasPending) {
      setShowPendingDialog(true);
    } else {
      const hasUnavailable = items.some((i) => i.status === "unavailable");
      if (hasUnavailable) { setCarryPendingChoice(false); setShowUnavailableDialog(true); }
      else { fireRpc(false, false); }
    }
  }, [items, fireRpc]);

  const handleCarryPending = useCallback(() => {
    setShowPendingDialog(false);
    const hasUnavailable = items.some((i) => i.status === "unavailable");
    if (hasUnavailable) { setCarryPendingChoice(true); setShowUnavailableDialog(true); }
    else { fireRpc(true, false); }
  }, [items, fireRpc]);

  const handleDropPending = useCallback(() => {
    setShowPendingDialog(false);
    const hasUnavailable = items.some((i) => i.status === "unavailable");
    if (hasUnavailable) { setCarryPendingChoice(false); setShowUnavailableDialog(true); }
    else { fireRpc(false, false); }
  }, [items, fireRpc]);

  const handleCancelPending    = useCallback(() => setShowPendingDialog(false), []);
  const handleCarryUnavailable = useCallback(() => { setShowUnavailableDialog(false); fireRpc(carryPendingChoice, true); }, [carryPendingChoice, fireRpc]);
  const handleDropUnavailable  = useCallback(() => { setShowUnavailableDialog(false); fireRpc(carryPendingChoice, false); }, [carryPendingChoice, fireRpc]);
  const handleCancelUnavailable = useCallback(() => setShowUnavailableDialog(false), []);
  const handleRevertPurchasedToPending = useCallback((itemId: string) => setConfirmRevertId(itemId), []);
  const confirmRevert = useCallback(() => { if (confirmRevertId) { markPending.mutate(confirmRevertId); setConfirmRevertId(null); } }, [confirmRevertId, markPending]);
  const cancelRevert  = useCallback(() => setConfirmRevertId(null), []);

  // ── Note dialog helpers ───────────────────────────────────────────────────
  const openNewNoteDialog = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    setShowNoteDialog(true);
  };
  const openEditNoteDialog = (n: ShoppingNote) => {
    setEditingNote(n);
    setNoteTitle(n.title ?? "");
    setNoteBody(n.note);
    setShowNoteDialog(true);
  };
  const closeNoteDialog = () => { setShowNoteDialog(false); setEditingNote(null); };
  const saveNote = () => {
    if (!noteBody.trim()) return;
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, note: noteBody.trim(), title: null }, { onSuccess: closeNoteDialog });
    } else {
      addNote.mutate({ note: noteBody.trim(), title: null }, { onSuccess: closeNoteDialog });
    }
  };

  const isLoading =
    activeListQuery.isLoading ||
    (!!listId && itemsQuery.isLoading) ||
    productsQuery.isLoading ||
    categoriesQuery.isLoading;

  if (isLoading) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">טוען רשימת קניות…</p>
      </section>
    );
  }

  if (!activeListQuery.data) {
    return (
      <section className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">רשימת קניות</h1>
        <p className="text-sm text-muted-foreground">לא נמצאה רשימה פעילה לבית זה.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 pb-10 lg:grid lg:grid-cols-[minmax(300px,_1.25fr)_3fr] lg:items-start">

      {/* ══ RIGHT (desktop) / TOP (mobile): Shopping list ══ */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,.07)]">

          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid #F0EEEA" }}>
            <h2 className="text-[22px] font-extrabold" style={{ color: "#202124" }}>הרשימה שלי</h2>
            <div className="relative">
              <ShoppingCart className="h-6 w-6" style={{ color: "#202124" }} />
              <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "#7B4FAF" }}>{totalCount}</span>
            </div>
          </div>

          {/* ── REMINDERS SECTION — shown only once at least one note exists ── */}
          {notes.length > 0 ? (
            <div style={{ borderBottom: "1px solid #F0EEEA" }}>
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-sm font-bold" style={{ color: "#7B5E00" }}>
                  💡 תזכורות ({notes.length})
                </span>
                <button type="button" onClick={() => setRemindersOpen((o) => !o)}
                  className="text-xs font-medium" style={{ color: "#5F6368" }}>
                  {remindersOpen ? "סגור ▲" : "פתח ▼"}
                </button>
              </div>
              {remindersOpen && (
                <div className="px-4 pb-2 flex flex-col gap-1.5">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-xl px-3 py-2.5"
                      style={{ background: "#FFFDE7", border: "1.5px solid #F9E44E" }}>
                      <div className="text-sm" style={{ color: "#4E342E", whiteSpace: "pre-wrap" }}>{n.note}</div>
                      <div className="flex gap-3 mt-1.5">
                        <button type="button" onClick={() => openEditNoteDialog(n)}
                          className="text-xs underline" style={{ color: "#7B4FAF" }}>עריכה</button>
                        <button type="button" onClick={() => setConfirmDeleteNoteId(n.id)}
                          className="text-xs underline" style={{ color: "#C0756F" }}>מחיקה</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 pb-3">
                <button type="button" onClick={openNewNoteDialog}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[10px] py-2 text-sm font-semibold transition-colors hover:bg-[#FFFDE7]"
                  style={{ border: "1.5px dashed #F9E44E", color: "#7B5E00" }}>
                  💡 הוסף תזכורת
                </button>
              </div>
            </div>
          ) : null}

          {/* ── ITEMS ── */}
          <div className="px-4 pb-2 flex flex-col gap-1.5">
            {items.length === 0 ? (
              <div className="py-4 text-center text-sm" style={{ color: "#5F6368" }}>
                הרשימה ריקה — לחצו על מוצר כדי להוסיפו
              </div>
            ) : (
              items.map((item) => {
                const isPurchased   = item.status === "purchased";
                const isUnavailable = item.status === "unavailable";

                if (isPurchased) {
                  return (
                    <div key={item.id} className="rounded-2xl px-4 py-2.5" style={{ background: "#EEF8F0" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-base font-medium line-through" style={{ color: "#9E9E9E" }}
                            title={item.product?.name ?? "מוצר לא ידוע"}>{item.product?.name ?? "מוצר לא ידוע"}</div>
                          <div className="text-xs mt-0.5 font-medium" style={{ color: "#4CAF50" }}>✓ נקנה</div>
                        </div>
                        <button type="button" onClick={() => handleRevertPurchasedToPending(item.id)}
                          className="shrink-0 text-xs underline" style={{ color: "#9E9E9E" }}>ביטול</button>
                      </div>
                    </div>
                  );
                }

                if (isUnavailable) {
                  return (
                    <div key={item.id} className="rounded-2xl px-4 py-2.5"
                      style={{ background: "#FFF5F5", border: "1.5px solid #EFCFCF" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-base font-medium" style={{ color: "#C0756F" }}
                            title={item.product?.name ?? "מוצר לא ידוע"}>{item.product?.name ?? "מוצר לא ידוע"}</div>
                          <div className="text-xs mt-0.5 font-medium" style={{ color: "#C0756F" }}>😕 לא נמצא</div>
                        </div>
                        <button type="button" onClick={() => markPending.mutate(item.id)}
                          disabled={markPending.isPending && markPending.variables === item.id}
                          className="shrink-0 text-xs underline disabled:opacity-50" style={{ color: "#9E9E9E" }}>ביטול</button>
                      </div>
                    </div>
                  );
                }

                /* pending */
                const imgSrc = getProductImagePath(item.product?.category_id, item.product?.image);
                return (
                  <div key={item.id} className="rounded-[14px] px-4 py-3" style={{ background: "#FAFAF8" }}>
                    <div className="flex items-center gap-3 mb-1.5">
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.product?.name ?? ""} loading="lazy" decoding="async"
                          className="shrink-0 rounded-[8px] object-cover" style={{ width: 46, height: 46 }} />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="truncate text-[18px] font-bold leading-tight" style={{ color: "#202124" }}
                            title={item.product?.name ?? "מוצר לא ידוע"}>{item.product?.name ?? "מוצר לא ידוע"}</div>
                          <span className="shrink-0 text-sm font-medium" style={{ color: "#202124" }}>כמות: {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => markPurchased.mutate(item.id)}
                        disabled={markPurchased.isPending && markPurchased.variables === item.id}
                        className="flex flex-1 items-center justify-center gap-1 rounded-[10px] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "#4CAF50" }}>
                        <span>✓</span><span>{markPurchased.isPending && markPurchased.variables === item.id ? "…" : "קניתי"}</span>
                      </button>
                      <button type="button" onClick={() => markUnavailable.mutate(item.id)}
                        disabled={markUnavailable.isPending && markUnavailable.variables === item.id}
                        className="flex flex-1 items-center justify-center gap-1 rounded-[10px] py-2.5 text-sm font-semibold transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                        style={{ color: "#202124", border: "1.5px solid #E65252", background: "#fff" }}>
                        <span>😕</span><span>{markUnavailable.isPending && markUnavailable.variables === item.id ? "…" : "לא מצאתי"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Complete trip button */}
          <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid #F0EEEA" }}>
            <button type="button" onClick={() => setShowCompleteTripDialog(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-[14px] py-3.5 text-[18px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
              style={{ background: "#E8734A" }}>
              <span>סיים קניות</span><span>✓</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ LEFT (desktop) / BOTTOM (mobile): Category browser + Search ══ */}
      <div>
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-[26px] font-extrabold" style={{ color: "#202124", letterSpacing: "-0.5px" }}>
              אז מה קונים היום?
            </h1>
            <button type="button" onClick={openNewNoteDialog}
              className="shrink-0 flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-[#FFFDE7]"
              style={{ border: "1.5px dashed #F9E44E", color: "#7B5E00", whiteSpace: "nowrap" }}>
              💡 הוסף תזכורת
            </button>
          </div>

          {/* Global search bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#9E9E9E" }} />
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש מוצר..."
              dir="rtl"
              className="w-full rounded-2xl py-3 pr-10 pl-10 text-[15px] outline-none transition-shadow"
              style={{
                background: "#FAFAF8",
                border: "1.5px solid #E0E0DE",
                color: "#202124",
                boxShadow: searchQuery ? "0 2px 12px rgba(123,79,175,.12)" : "none",
              }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-[#F0F0EE]">
                <X className="h-4 w-4" style={{ color: "#9E9E9E" }} />
              </button>
            )}
          </div>
        </div>

        {/* ── SEARCH RESULTS ────────────────────────────────────────────── */}
        {isSearchActive ? (
          <div className="overflow-hidden rounded-[20px] bg-white" style={{ boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
            {searchResults!.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: "#5F6368" }}>
                לא נמצאו מוצרים עבור "{searchQuery}"
              </p>
            ) : (
              searchResults!.map((p, idx) => {
                const item      = itemsByProductId.get(p.id);
                const inList    = !!item;
                const qty       = getProductQty(p.id);
                const isSaving  = setItemQty.isPending && (setItemQty.variables as { productId: string } | undefined)?.productId === p.id;
                const success   = productSuccess[p.id];
                const isLast    = idx === searchResults!.length - 1;
                const imgSrc    = getProductImagePath(p.category_id, p.image);
                const catName   = p.category_id ? categoryNameBySlugs.get(p.category_id) : undefined;
                return (
                  <div
                    key={p.id}
                    className="flex w-full items-center gap-3 px-4 py-3"
                    style={{ borderBottom: isLast ? "none" : "1px solid #F5F5F3" }}
                  >
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.name} loading="lazy" decoding="async"
                        className="shrink-0 rounded-lg object-cover" style={{ width: 40, height: 40 }} />
                    ) : (
                      <div className="shrink-0 rounded-lg" style={{ width: 40, height: 40, background: "#F5F5F3" }} />
                    )}
                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-[15px] font-semibold" style={{ color: "#202124" }}>{p.name}</div>
                      {catName && <div className="text-xs mt-0.5" style={{ color: "#5F6368" }}>{catName}</div>}
                      {inList && <div className="text-xs mt-0.5 font-medium" style={{ color: "#4CAF50" }}>✓ כבר ברשימה</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-[8px] bg-white" style={{ border: "1px solid #E0E0DE" }}>
                        <button type="button" aria-label="הפחת כמות" onClick={() => bumpProductQty(p.id, -1)}
                          className="flex h-8 w-8 items-center justify-center text-base transition-colors hover:bg-[#F5F5F3]"
                          style={{ color: "#5F6368" }}>−</button>
                        <div className="flex h-8 w-8 items-center justify-center text-sm font-bold" style={{ color: qty === 0 ? "#C0756F" : "#202124" }}>{qty}</div>
                        <button type="button" aria-label="הגדל כמות" onClick={() => bumpProductQty(p.id, 1)}
                          className="flex h-8 w-8 items-center justify-center text-base transition-colors hover:bg-[#F5F5F3]"
                          style={{ color: "#5F6368" }}>+</button>
                      </div>
                      {success ? (
                        <div className="rounded-[8px] px-3 py-1.5 text-sm font-bold"
                          style={{ color: "#4CAF50", background: "#EEF8F0", minWidth: 90, textAlign: "center" }}>
                          ✓ {success === "added" ? "נוסף!" : "עודכן!"}
                        </div>
                      ) : (
                        <button type="button" disabled={isSaving || !listId}
                          onClick={() => setItemQty.mutate({ productId: p.id, qty }, {
                            onSuccess: () => { resetProductQty(p.id); showProductSuccess(p.id, inList ? "updated" : "added"); }
                          })}
                          className="rounded-[8px] px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: "#7B4FAF", minWidth: 90, textAlign: "center" }}>
                          {isSaving ? "…" : inList ? "💾 עדכן" : "➕ הוסף"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── CATEGORY GRID ──────────────────────────────────────────────── */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((cat) => {
              const catProducts   = productsByCategory.get(cat.slug) ?? [];
              const isOpen        = openCategory === cat.slug;
              const selectedInCat = catProducts.filter((p) => itemsByProductId.has(p.id)).length;
              const catImgSrc     = getCategoryImagePath(cat.image);

              return (
                <div key={cat.slug} className="contents">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.slug)}
                    aria-expanded={isOpen}
                    className="relative overflow-hidden rounded-2xl bg-white text-center transition-all duration-200 hover:scale-[1.02]"
                    style={{ boxShadow: isOpen ? "0 6px 24px rgba(123,79,175,.15)" : "0 2px 12px rgba(0,0,0,.05)" }}
                  >
                    {catImgSrc && (
                      <img src={catImgSrc} alt={cat.display_name_he} loading="lazy" decoding="async"
                        style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
                    )}
                    <div className="px-3 py-2.5">
                      <div className="text-[16px] font-bold" style={{ color: isOpen ? "#7B4FAF" : "#202124" }}>
                        {cat.display_name_he}
                      </div>
                      {catProducts.length > 0 && (
                        <div className="text-[13px] mt-0.5" style={{ color: "#5F6368" }}>{catProducts.length} מוצרים</div>
                      )}
                    </div>
                    {selectedInCat > 0 && (
                      <span className="absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                        style={{ background: "#7B4FAF" }}>{selectedInCat}</span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="col-span-2 overflow-hidden rounded-[20px] bg-white sm:col-span-3 lg:col-span-4 xl:col-span-5"
                      style={{ boxShadow: "0 6px 24px rgba(123,79,175,.15)" }}>
                      {catImgSrc && (
                        <img src={catImgSrc} alt={cat.display_name_he} loading="lazy" decoding="async"
                          style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
                      )}
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F0F0EE" }}>
                        <span className="text-lg font-bold" style={{ color: "#7B4FAF" }}>{cat.display_name_he}</span>
                        {catProducts.length > 0 && (
                          <span className="text-sm" style={{ color: "#5F6368" }}>{catProducts.length} מוצרים</span>
                        )}
                      </div>
                      {catProducts.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm" style={{ color: "#5F6368" }}>אין מוצרים בקטגוריה זו</p>
                      ) : (
                        catProducts.map((p, idx) => {
                          const item      = itemsByProductId.get(p.id);
                          const inList    = !!item;
                          const qty       = getProductQty(p.id);
                          const isSaving  = setItemQty.isPending && (setItemQty.variables as { productId: string } | undefined)?.productId === p.id;
                          const success   = productSuccess[p.id];
                          const isLast    = idx === catProducts.length - 1;
                          const imgSrc    = getProductImagePath(p.category_id, p.image);
                          return (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                              style={{ borderBottom: isLast ? "none" : "1px solid #F5F5F3" }}>
                              {imgSrc ? (
                                <img src={imgSrc} alt={p.name} loading="lazy" decoding="async"
                                  className="shrink-0 rounded-lg object-cover" style={{ width: 40, height: 40 }} />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[15px] font-semibold" style={{ color: "#202124" }}>{p.name}</div>
                                {inList && (
                                  <div className="text-xs mt-0.5 font-medium" style={{ color: "#4CAF50" }}>✓ כבר ברשימה</div>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <div className="flex items-center overflow-hidden rounded-[8px] bg-white" style={{ border: "1px solid #E0E0DE" }}>
                                  <button type="button" aria-label="הפחת כמות" onClick={() => bumpProductQty(p.id, -1)}
                                    className="flex h-8 w-8 items-center justify-center text-base transition-colors hover:bg-[#F5F5F3]"
                                    style={{ color: "#5F6368" }}>−</button>
                                  <div className="flex h-8 w-8 items-center justify-center text-sm font-bold"
                                    style={{ color: qty === 0 ? "#C0756F" : "#202124" }}>{qty}</div>
                                  <button type="button" aria-label="הגדל כמות" onClick={() => bumpProductQty(p.id, 1)}
                                    className="flex h-8 w-8 items-center justify-center text-base transition-colors hover:bg-[#F5F5F3]"
                                    style={{ color: "#5F6368" }}>+</button>
                                </div>
                                {success ? (
                                  <div className="rounded-[8px] px-3 py-1.5 text-sm font-bold"
                                    style={{ color: "#4CAF50", background: "#EEF8F0", minWidth: 90, textAlign: "center" }}>
                                    ✓ {success === "added" ? "נוסף!" : "עודכן!"}
                                  </div>
                                ) : (
                                  <button type="button" disabled={isSaving || !listId}
                                    onClick={() => setItemQty.mutate({ productId: p.id, qty }, {
                                      onSuccess: () => { resetProductQty(p.id); showProductSuccess(p.id, inList ? "updated" : "added"); }
                                    })}
                                    className="rounded-[8px] px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                    style={{ background: "#7B4FAF", minWidth: 90, textAlign: "center" }}>
                                    {isSaving ? "…" : inList ? "💾 עדכן" : "➕ הוסף"}
                                  </button>
                                )}
                              </div>
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
        )}
      </div>

      {/* ══ NOTE DIALOG ══ */}
      {showNoteDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="note-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeNoteDialog}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 id="note-dialog-title" className="mb-4 text-lg font-bold" style={{ color: "#202124" }}>
                {editingNote ? "עריכת הערה" : "הוספת הערה"}
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#5F6368" }}>הערה <span style={{ color: "#C0756F" }}>*</span></label>
                <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)}
                  dir="rtl" placeholder="כתוב הערה כאן..." rows={4}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ border: "1.5px solid #E0E0DE", color: "#202124", background: "#FAFAF8" }} />
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={saveNote}
                  disabled={(addNote.isPending || updateNote.isPending) || !noteBody.trim()}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#7B4FAF" }}>
                  {(addNote.isPending || updateNote.isPending) ? "שומר…" : "שמור"}
                </button>
                <button type="button" onClick={closeNoteDialog}
                  className="flex-1 rounded-2xl border py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE NOTE ══ */}
      {confirmDeleteNoteId && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmDeleteNoteId(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 className="mb-2 text-lg font-bold" style={{ color: "#202124" }}>מחיקת הערה?</h2>
              <p className="mb-5 text-sm" style={{ color: "#5F6368" }}>פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => { deleteNote.mutate(confirmDeleteNoteId, { onSuccess: () => setConfirmDeleteNoteId(null) }); }}
                  disabled={deleteNote.isPending}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#E65252" }}>
                  {deleteNote.isPending ? "מוחק…" : "מחק"}
                </button>
                <button type="button" onClick={() => setConfirmDeleteNoteId(null)}
                  className="flex-1 rounded-2xl border py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPLETE TRIP DIALOGS (logic unchanged) ══ */}
      {showCompleteTripDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="complete-trip-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowCompleteTripDialog(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 id="complete-trip-title" className="mb-5 text-lg font-bold" style={{ color: "#202124" }}>סיימת את הקניות?</h2>
              <div className="flex gap-3">
                <button type="button" onClick={handleCompleteShoppingTrip} disabled={completeTrip.isPending}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#7B4FAF" }}>{completeTrip.isPending ? "מסיים…" : "כן"}</button>
                <button type="button" onClick={() => setShowCompleteTripDialog(false)}
                  className="flex-1 rounded-2xl border py-3 text-sm font-semibold transition-colors hover:bg-[#FAFAF8]"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>לא</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completeTripToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 max-w-sm rounded-2xl px-5 py-3.5 text-center text-sm font-semibold shadow-xl text-white"
          style={{ background: tripError ? "#C0756F" : "#7B4FAF" }}>
          {tripError ?? successToastMsg}
        </div>
      )}

      {showPendingDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="pending-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={handleCancelPending}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 id="pending-dialog-title" className="mb-1 text-lg font-bold" style={{ color: "#202124" }}>יש מוצרים שלא סומנו</h2>
              <p className="mb-3 text-sm" style={{ color: "#5F6368" }}>המוצרים הבאים עדיין לא סומנו. מה תרצה לעשות?</p>
              <ul className="mb-5 space-y-1">
                {items.filter((i) => i.status === "pending").map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm" style={{ color: "#202124" }}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#7B4FAF" }} />
                    {i.product?.name ?? "מוצר לא ידוע"}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleCarryPending}
                  className="w-full rounded-2xl py-3 text-sm font-bold text-white hover:opacity-90" style={{ background: "#7B4FAF" }}>העבר לרשימה הבאה</button>
                <button type="button" onClick={handleDropPending}
                  className="w-full rounded-2xl py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #EFCFCF", color: "#C0756F", background: "#FFF5F5" }}>אל תעביר</button>
                <button type="button" onClick={handleCancelPending}
                  className="w-full rounded-2xl py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>חזור לרשימה</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUnavailableDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="unavailable-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={handleCancelUnavailable}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 id="unavailable-dialog-title" className="mb-3 text-lg font-bold" style={{ color: "#202124" }}>המוצרים הבאים לא נמצאו</h2>
              <ul className="mb-5 space-y-1">
                {items.filter((i) => i.status === "unavailable").map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm" style={{ color: "#202124" }}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C0756F" }} />
                    {i.product?.name ?? "מוצר לא ידוע"}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleCarryUnavailable} disabled={completeTrip.isPending}
                  className="w-full rounded-2xl py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#7B4FAF" }}>{completeTrip.isPending ? "מסיים…" : "העבר לרשימה הבאה"}</button>
                <button type="button" onClick={handleDropUnavailable} disabled={completeTrip.isPending}
                  className="w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
                  style={{ border: "1.5px solid #EFCFCF", color: "#C0756F", background: "#FFF5F5" }}>
                  {completeTrip.isPending ? "מסיים…" : "אל תעביר"}</button>
                <button type="button" onClick={handleCancelUnavailable}
                  className="w-full rounded-2xl py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmRevertId !== null && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-revert-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={cancelRevert}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-6">
              <h2 id="confirm-revert-title" className="mb-2 text-lg font-bold" style={{ color: "#202124" }}>להחזיר לממתין?</h2>
              <p className="mb-5 text-sm" style={{ color: "#5F6368" }}>הפריט סומן כנקנה. האם לבטל את הסימון ולהחזירו לממתין?</p>
              <div className="flex gap-3">
                <button type="button" onClick={confirmRevert} disabled={markPending.isPending}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#7B4FAF" }}>{markPending.isPending ? "מעדכן…" : "כן, החזר לממתין"}</button>
                <button type="button" onClick={cancelRevert}
                  className="flex-1 rounded-2xl border py-3 text-sm font-semibold"
                  style={{ border: "1.5px solid #E0E0DE", color: "#5F6368" }}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
