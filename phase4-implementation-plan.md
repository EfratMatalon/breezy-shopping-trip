# תוכנית מימוש שלב 4 — חלוקה ל-Slices

מסמך תכנון בלבד, מבוסס על `phase4-readiness-report.md`. **לא בוצע שינוי קוד, לא הותחל מימוש.** כל Slice עצמאי-יחסית וניתן ל-PR נפרד; הסדר מומלץ כתלות (Slice 2 דורש Slice 1, Slice 3-5 דורשים Slice 2 וכו').

---

## Slice 1 — Shopping Dashboard (קריאה בלבד)

**מטרה:** דשבורד `/` קורא רשימה פעילה מ-Supabase במקום מ-`useAppState`.

**Files affected:**
- `src/lib/queries/queryKeys.ts` (הוספת `activeList`, `listItems`)
- `src/lib/queries/lists.ts` (חדש) — `fetchActiveList`, `fetchListItems`
- `src/routes/index.tsx` — החלפת `useAppState` ב-`useQuery`

**Queries:**
- `fetchActiveList(householdId)` → `shopping_lists` (`status='active'`)
- `fetchListItems(listId)` → `shopping_items` + `products` join

**Mutations:** אין.

**Acceptance criteria:**
- הדשבורד מציג תקציר (מספר פריטים, תצוגה מקדימה) מנתוני Supabase אמיתיים, לא מ-localStorage.
- אם אין רשימה פעילה — מוצג מצב שגיאה/Empty State (לא קריסה).
- ניווט ל-`/workspace`/`/history` ללא שינוי.

**Risks:**
- כל בית צריך רשימה פעילה תמיד (הבטחה מה-RPCs) — אם בכל זאת `null`, צריך טיפול הגנתי.
- שינוי מבנה state (`selectedItems` → `listItems`) עלול לשבור קומפוננטות משותפות שטרם הועברו.

---

## Slice 2 — Shopping Workspace (קריאה בלבד)

**מטרה:** `/workspace` מציג פריטי הרשימה הפעילה וקטלוג מוצרים מ-Supabase, ללא יכולת עריכה עדיין.

**Files affected:**
- `src/lib/queries/products.ts` (חדש) — `fetchProducts`
- `src/lib/queries/queryKeys.ts` — הוספת `products`
- `src/routes/workspace.tsx` — מקור הנתונים `productsByCategory`/`state.selectedItems` עובר ל-React Query (כפתורי הוספה/כמות מנוטרלים זמנית או "stub")

**Queries:**
- `fetchActiveList(householdId)`, `fetchListItems(listId)` (מ-Slice 1)
- `fetchProducts(householdId)` → `products` (`household_id IS NULL OR =:id`)

**Mutations:** אין (נדחה ל-Slice 3+).

**Acceptance criteria:**
- רשימת הקטגוריות/מוצרים מוצגת מ-`fetchProducts` (כולל מוצרי בית, אם קיימים).
- עגלה צדית מציגה את `listItems` הקיימים מה-DB (כמות, שם, קטגוריה).
- כל פעולת כתיבה (הוספה/שינוי כמות) מנוטרלת/מוסתרת ב-UI עד Slice 3.

**Risks:**
- `state.userProducts` הישן (localStorage) לא יתאים ל-`products` עם `household_id` — נדרש מיפוי/ניקוי.
- ביצועים: `fetchProducts` מחזיר קטלוג גדול (69+) — לבדוק זמן טעינה וצורך ב-cache (`staleTime`).

---

## Slice 3 — Add Item Flow

**מטרה:** הוספת פריט קיים/חדש לרשימה הפעילה, כולל "הוספה מהירה".

**Files affected:**
- `src/lib/queries/items.ts` (חדש) — `addItem`, `addUserProduct`
- `src/routes/workspace.tsx` — חיווט `handleAdd`, `handleQuickAdd`, כפתורי `+` לכל מוצר

**Queries:** ללא שינוי (Slice 1-2).

**Mutations:**
- `addItem({listId, productId, quantity})` → `insert`/`upsert` ל-`shopping_items` (merge ב-`ON CONFLICT (list_id, product_id)`)
- `addUserProduct({name, category, householdId})` → `insert` ל-`products`, ואז `addItem`

**Acceptance criteria:**
- לחיצה על מוצר קיים מוסיפה/מעלה כמות ב-`shopping_items`, עם `invalidate` של `queryKeys.listItems`.
- "הוספה מהירה" עם שם חדש יוצרת מוצר ב-`products` (`household_id` של הבית) ומוסיפה אותו לרשימה.
- ניסיון הוספה כששדה ריק — נחסם בלקוח (ולידציה).
- שגיאת ייחודיות (`normalized_name`) מוצגת כהודעה ידידותית.

**Risks:**
- הוספה רק מותרת אם `shopping_lists.status='active'` (RLS) — מצב מרוץ אם הרשימה הושלמה במקביל (Slice 5/7) → לטפל בשגיאת RLS ע"י רענון `activeList`.
- CHECK `quantity > 0` — UI חייב לחסום `0`/שלילי לפני שליחה.

---

## Slice 4 — Toggle Purchased (סימון נאסף / לא במלאי)

**מטרה:** עדכון סטטוס פריט (`pending`/`purchased`/`unavailable`) וכמות/מחיקה.

**Files affected:**
- `src/lib/queries/items.ts` — הוספת `setItemStatus`, `updateItemQuantity`, `deleteItem`
- `src/routes/workspace.tsx` — `toggleCollected`, כפתורי `+/-`/מחיקה בעגלה

**Queries:** ללא שינוי.

**Mutations:**
- `setItemStatus({itemId, status})` → `update shopping_items set status=..., status_updated_by=auth.uid(), status_updated_at=now()`
- `updateItemQuantity({itemId, quantity})` → `update quantity`; `quantity<=0` ⇒ קריאה ל-`deleteItem`
- `deleteItem(itemId)` → `delete from shopping_items`

**Acceptance criteria:**
- סימון "נאסף" מעדכן `status='purchased'` ב-DB ומשתקף מיידית ב-UI (optimistic update + invalidate).
- שינוי כמות ל-0 מוחק את הפריט מה-DB ומה-UI.
- מחיקה ידנית (כפתור X) מוחקת מ-DB.

**Risks:**
- Optimistic updates עלולים להתנגש עם Realtime (Slice 7) אם מיושמים בו-זמנית — לתעד שעד Slice 7 אין מנוי Realtime, כך שאין race בפועל.
- "Undo" שצוין בעיצוב (Toast עם ביטול) לא נכלל כ-mutation נפרד — מומש כ-`setItemStatus` הפוך; להבהיר UX.

---

## Slice 5 — Complete Shopping Trip

**מטרה:** כפתור "סיימתי קניות" קורא ל-RPC `complete_shopping_trip` ומעבר לרשימה חדשה.

**Files affected:**
- `src/lib/queries/lists.ts` — הוספת `completeShoppingTrip`
- `src/routes/workspace.tsx` — `finishList`/`completeFinish`/`handleSaveLeftoversForNext`
- `src/routes/index.tsx` — אופציונלי: Toast/הודעת הצלחה לאחר חזרה

**Queries:** רענון `queryKeys.activeList`, `queryKeys.listItems` עם ה-`list_id` החדש.

**Mutations:**
- `completeShoppingTrip(householdId)` → `rpc("complete_shopping_trip", {p_household_id})` — מחזיר `list_id` חדש; קריאה ל-`queryClient.setQueryData`/`invalidateQueries`.

**Acceptance criteria:**
- לחיצה על "סיימתי קניות" (כשכל הפריטים מסומנים) קוראת ל-RPC, מציגה מסך הצלחה, ומנווטת ל-`/`.
- אם נשארו פריטים לא מסומנים — מודאל "Leftover" הקיים מוצג לפני הקריאה ל-RPC (UI-only, ללא שינוי בלוגיקה).
- אחרי ההשלמה: הרשימה הישנה הופכת ל-`completed`, פריטי `unavailable` עברו לרשימה החדשה כ-`pending`, ומוצרים חזרתיים (`recurring_products`) נוספו.
- הדשבורד (`/`) מציג את הרשימה החדשה (הריקה/עם חזרתיים) ולא את הישנה.

**Risks:**
- RPC היא `SECURITY DEFINER` עם `FORBIDDEN`/`NOT_FOUND` — יש למפות שגיאות אלו (`householdErrorMessage`-style) להודעות בעברית.
- מצב מרוץ: שני חברי בית לוחצים "סיימתי קניות" בו-זמנית — RPC השנייה תקבל `NOT_FOUND` (אין רשימה פעילה ישנה) — לטפל בהודעה מתאימה ורענון.

---

## Slice 6 — History Screen

**מטרה:** `/history` מציג רשימות `completed` מה-DB.

**Files affected:**
- `src/lib/queries/lists.ts` — הוספת `fetchCompletedLists`
- `src/lib/queries/queryKeys.ts` — הוספת `completedLists`
- `src/routes/history.tsx` — החלפת `state.shoppingLists`/`deleteList`/`replaceSelectedItems`

**Queries:**
- `fetchCompletedLists(householdId, limit=10)` → `shopping_lists` (`status='completed'`, מסודר `completed_at desc`)
- `fetchListItems(listId)` — lazy, בעת פתיחת accordion

**Mutations:**
- "השתמש שוב ברשימה": לולאת `addItem` על פריטי הרשימה הנבחרת אל הרשימה הפעילה (לא RPC, הרכבה מ-Slice 3).
- "מחיקה": **לא ממומש** — אין RPC/RLS תואם; הכפתור מוסר מה-UI (Out-of-Scope, כפי שסוכם ב-`phase4-readiness-report.md`).

**Acceptance criteria:**
- רשימת 10 ההיסטוריות האחרונות מוצגת עם תאריך `completed_at` ומספר פריטים/יחידות.
- פתיחת רשימה מציגה את פריטיה (`fetchListItems`) עם שם המוצר מ-`products`.
- "השתמש שוב ברשימה" מוסיף את כל הפריטים לרשימה הפעילה ומנווט ל-`/workspace`, עם אישור (`confirm`) אם הרשימה הפעילה לא ריקה.
- כפתור "מחיקה" אינו קיים יותר ב-UI.

**Risks:**
- "השתמש שוב" כלולאת `addItem` עלולה ליצור N קריאות רשת — לשקול `bulk insert`/RPC עתידי (לא בשלב זה).
- רשימות עם פריטים שנמחקו מהקטלוג (`products`) — `getProduct` עלול להחזיר `undefined`; לטפל ב-fallback "מוצר לא ידוע" כמו בקוד הקיים.

---

## Slice 7 — Realtime Synchronization

**מטרה:** עדכון חי של `shopping_items` בין מכשירים/חברי בית, לפי 00007 (`alter publication supabase_realtime add table shopping_items`).

**Files affected:**
- `src/lib/queries/items.ts` / קובץ חדש `src/lib/realtime/useShoppingItemsChannel.ts`
- `src/routes/workspace.tsx` — הרשמה לערוץ לפי `list_id` הפעיל

**Queries:** אין חדשות; הערוץ מפעיל `invalidateQueries(queryKeys.listItems(listId))` / `setQueryData` בעת אירועי `INSERT`/`UPDATE`/`DELETE`.

**Mutations:** אין חדשות — Slice זה רק מוסיף סנכרון לקריאות הקיימות.

**Acceptance criteria:**
- שינוי שמתבצע ממכשיר/משתמש אחר (הוספה/סימון/מחיקה) מופיע ב-Workspace ללא רענון ידני, תוך זמן סביר (< 2 שניות).
- אין "קפיצות" UI כפולות כשהמשתמש עצמו מבצע פעולה (optimistic update + אירוע Realtime לא יוצרים כפילות).
- הערוץ מסונן ל-`list_id=eq.{activeListId}` בלבד (לא כל הבית/לא כל המסד).
- בעת ניתוק/חיבור מחדש (offline→online) — הנתונים מסתנכרנים (refetch בעת `reconnect`).

**Risks:**
- מצב מרוץ optimistic-vs-Realtime (Slice 4) — דורש מפתח דה-דופליקציה (למשל `updated_at`/`status_updated_at`).
- מעבר `list_id` (לאחר Slice 5, `complete_shopping_trip`) מחייב resubscribe לערוץ החדש — ניקוי מנוי ישן נדרש כדי למנוע memory leak/אירועים על רשימה לא רלוונטית.
- עומס: בית עם הרבה חברים פעילים בו-זמנית עלול לגרום להמון אירועים — לשקול debounce ל-`invalidateQueries`.

---

## סדר תלויות מומלץ

```
Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6
                                                  ↘
                                                   Slice 7 (אחרי 4-5, יכול להיות מקביל ל-6)
```

**סטטוס:** מסמך תכנון בלבד. לא בוצע שינוי קוד, לא הותחל מימוש.
