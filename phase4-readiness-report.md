# דוח מוכנות לשלב 4 — מיפוי מסכים מאושרים ↔ מימוש

מסמך זה ממפה את 4 המסכים שאושרו (באישור חלקי) ב-`shopping-ui-design-review.md` למבנה מימוש קונקרטי: Route, Queries, Mutations, Tables, RPCs, חוקי ולידציה, קומפוננטות. **לא בוצע שינוי קוד** — זהו מסמך תכנון בלבד, ומהווה בסיס להערכת שלב 4.

המצב הקיים: כל 4 המסכים קיימים כקבצי Route, אך מבוססים על `lib/store.tsx` (state מקומי + localStorage, `AppStateProvider`/`useAppState`) ועל `lib/shopping.ts` (קובץ legacy לא בשימוש בפועל על ידי ה-routes). שכבת ה-queries הקיימת (`lib/queries/households.ts`, `queryKeys.ts`) היא הדוגמה לתבנית שיש להמשיך עבור פריטים/רשימות.

---

## 1. Shopping Dashboard — `/`

**Route:** `src/routes/index.tsx` (קיים, `beforeLoad: requireAuth + requireHousehold`)

**Queries (חדשות, `lib/queries/lists.ts`):**
- `fetchActiveList(householdId)` — `shopping_lists` עם `status='active'` (יחיד, אינדקס `shopping_lists_one_active_per_household`)
- `fetchListItems(listId)` — `shopping_items` + `products` (join), ממוין לפי `sort_order`/קטגוריה
- `queryKeys.activeList(householdId)`, `queryKeys.listItems(listId)`

**Mutations:** אין במסך זה עצמו (רק ניווט/תצוגת תקציר). אופציונלי: `prefetchListItems` ב-`beforeLoad`/`Link.preload`.

**Tables:** `shopping_lists`, `shopping_items`, `products`, `household_members` (לקבלת `household_id` מ-`HouseholdProvider`).

**RPCs:** אין ישיר; נסמך על תוצאת `create_household`/`complete_shopping_trip` (יוצרים את הרשימה הפעילה).

**חוקי ולידציה:**
- אם `fetchActiveList` מחזיר `null` — מצב קצה לא צפוי (כל בית צריך רשימה פעילה תמיד, ר' RPCs); להציג מצב שגיאה/Empty State לפי `shopping-ui-design-v1.md` §6.
- תקציר ("כבר התחלת רשימה") מוצג רק אם `listItems.length > 0`.

**קומפוננטות:**
- `Home` (קיים, להחליף `useAppState` ב-React Query hooks)
- כרטיס תקציר רשימה פעילה (קיים בעיצוב, להזין מ-`listItems`)
- כפתורי ניווט `/workspace`, `/history` (קיימים, ללא שינוי)

**הערות מהביקורת:** אין מסך/state מוגדר לתוצאת `complete_shopping_trip` — מומלץ Toast קצר בדשבורד בעת חזרה מ-`/workspace` אחרי השלמת קנייה (סעיף 2 בביקורת).

---

## 2. Shopping Workspace — `/workspace`

**Route:** `src/routes/workspace.tsx` (קיים, `beforeLoad: requireAuth + requireHousehold`)

**Queries (`lib/queries/lists.ts`, `lib/queries/products.ts`):**
- `fetchActiveList(householdId)`
- `fetchListItems(listId)` — מקור האמת היחיד ל"רשימה הנוכחית" (מחליף `state.selectedItems`)
- `fetchProducts(householdId)` — `products` עם `household_id IS NULL OR household_id = :id` (קטלוג מערכת + מוצרי בית)
- `queryKeys.products(householdId)`

**Mutations (`lib/queries/items.ts`):**
- `addItem({listId, productId, quantity})` → `insert` ל-`shopping_items`, `ON CONFLICT (list_id, product_id)` → `update quantity` (merge, מקביל ל-`addSelectedItem`)
- `updateItemQuantity({itemId, quantity})` → `update shopping_items.quantity`; `quantity <= 0` ⇒ `deleteItem`
- `deleteItem(itemId)` → `delete from shopping_items`
- `setItemStatus({itemId, status})` → `update status, status_updated_by=auth.uid(), status_updated_at=now()` (`pending`/`purchased`/`unavailable` — מקביל ל"סימון כנאסף")
- `addUserProduct({name, category, householdId})` → `insert` ל-`products` עם `household_id` (לא `null`), `normalized_name` מחושב
- `completeShoppingTrip(householdId)` → `rpc("complete_shopping_trip", {p_household_id})`
- `dismissSuggestion({productId, householdId})` → `insert` ל-`suggestion_dismissals`

**Tables:** `shopping_items`, `shopping_lists`, `products`, `recurring_products` (להצעות "אולי תרצה גם"), `suggestion_dismissals`.

**RPCs:** `complete_shopping_trip(p_household_id)` — מחליף את `saveCurrentList + startNewCycle`; מחזיר `list_id` חדש (יש ל-`invalidate`/`setQueryData` על `queryKeys.activeList` ו-`queryKeys.listItems`).

**חוקי ולידציה:**
- הוספת פריט מותרת רק אם הרשימה `status='active'` (RLS `shopping_items_insert_member`) — אם הרשימה הושלמה במקביל (race), Realtime/refetch יחזיר שגיאה; להציג הודעה ולרפרש `activeList`.
- `quantity` חייב `> 0` (CHECK constraint) — UI חוסם `0`/שלילי.
- `UNIQUE (list_id, product_id)` — הוספה כפולה מתבצעת כ-`upsert`/merge בלקוח, לא כשגיאה.
- "סיימתי קניות": אם קיימים פריטים `pending`/לא מסומנים — להציג את מודאל "Leftover" הקיים (קיים כ-state מקומי, להישאר UI-only) לפני קריאה ל-`complete_shopping_trip`.

**קומפוננטות:**
- `Workspace` (קיים, להחליף את כל הקריאות ל-`useAppState` ב-hooks של React Query + mutations)
- מודאל "Leftover" (קיים, UI-only)
- מסך "סיום קנייה" (`finishedCount`, קיים, להציג תוצאה מ-`completeShoppingTrip`)
- הצעות חוזרות ("אולי תרצה גם") — לבסס על `recurring_products` + `suggestion_dismissals` בפועל (Realtime עדכון לפי 00007)

**הערות מהביקורת:** Realtime על `shopping_items` (subscribe `list_id=eq.{activeListId}`) — לטפל ב-race בין עדכון מקומי (optimistic) לעדכון מ-channel; דגש על "Undo" pattern שצוין בעיצוב כדורש החזרת status קודם (לא מומש כ-RPC נפרד — UPDATE רגיל).

---

## 3. Add Item Modal

**Route:** אינו Route נפרד — Sheet/Dialog בתוך `/workspace` (תואם לעיצוב).

**Queries:**
- `fetchProducts(householdId)` (מקטלוג + מוצרי בית, לחיפוש/autocomplete)

**Mutations:**
- `addItem` ו/או `addUserProduct` + `addItem` (כשאין התאמה מדויקת — כמו `handleQuickAdd` הקיים)

**Tables:** `products`, `shopping_items`.

**RPCs:** אין.

**חוקי ולידציה:**
- שם מוצר חדש: `trim()`, לא ריק, `normalized_name` ייחודי בתוך הבית (`products` partial unique index `(household_id, normalized_name) WHERE household_id IS NOT NULL`) — טיפול בשגיאת התנגשות מה-DB.
- כמות התחלתית `>= 1`.

**קומפוננטות:**
- טופס "הוספה מהירה" הקיים (`handleQuickAdd`) — להעביר ללוגיקת `addItem`/`addUserProduct` אסינכרונית עם טיפול בשגיאות.
- רשימת קטגוריות/פריטים לבחירה (קיים, להזין מ-`fetchProducts`).

---

## 4. History — `/history`

**Route:** `src/routes/history.tsx` (קיים, `beforeLoad: requireAuth + requireHousehold`)

**Queries (`lib/queries/lists.ts`):**
- `fetchCompletedLists(householdId, limit=10)` — `shopping_lists` עם `status='completed'`, מסודר לפי `completed_at desc`
- `fetchListItems(listId)` — לכל רשימה שנפתחת (lazy, בעת `setOpenId`)
- `queryKeys.completedLists(householdId)`, `queryKeys.listItems(listId)`

**Mutations:**
- אין מחיקה/עריכה ברשימות היסטוריות במסד (אין RPC/מדיניות RLS למחיקת `shopping_lists` — הפעולה `deleteList` הקיימת היא local-only ואינה תואמת לסכמה; **לא לכלול** בשלב 4 לפי הביקורת).
- "השתמש שוב ברשימה": אין mutation ישיר — פעולה זו צריכה לעבור דרך `addItem` בלולאה על פריטי הרשימה הנבחרת לרשימה הפעילה (לא RPC קיים).

**Tables:** `shopping_lists`, `shopping_items`, `products`.

**RPCs:** אין ישיר (קריאה בלבד).

**חוקי ולידציה:**
- הצגת `completed_at`/`completed_by` (לא `savedAt` כמו ב-state הישן).
- "השתמש שוב" — לבדוק שהרשימה הפעילה הנוכחית קיימת (`fetchActiveList`) לפני הוספת הפריטים; אזהרת אישור אם הרשימה הפעילה לא ריקה (כמו ה-`confirm` הקיים).

**קומפוננטות:**
- `History` (קיים, להחליף `state.shoppingLists`/`deleteList` ב-`fetchCompletedLists`)
- פריט מתרחב (accordion) — קיים, להזין items מ-`fetchListItems` (lazy load).
- הסרת כפתור "מחיקה" או הפיכתו ל-Out-of-Scope לשלב 4 (אין תמיכה בסכמה/RLS).

---

## סיכום פערים לפני התחלת מימוש

1. יש ליצור `lib/queries/lists.ts`, `lib/queries/items.ts`, `lib/queries/products.ts` והרחבת `queryKeys.ts` בהתאם למפתחות שצוינו לעיל.
2. `lib/store.tsx` ו-`lib/shopping.ts` (legacy) יוחלפו בהדרגה — מומלץ לשמור את `AppStateProvider` רק לזיכרון UI-only (כמו `collectedIds`, `openCategory`) ולא לנתוני רשימה/פריטים.
3. פעולת "מחיקת רשימה" בהיסטוריה ופעולת "השתמש שוב" דורשות הבהרה/החלטה (אין RPC תואם) — לסמן כ-Out-of-Scope או להגדיר מימוש לקוח-בלבד (סדרת `addItem`).
4. Realtime על `shopping_items` (00007) טרם משולב — נדרש ב-Workspace לעדכון שיתופי בזמן אמת.

**סטטוס:** דוח מוכנות זה הוא בסיס לתכנון בלבד. לא בוצע שינוי קוד, לא הותחל מימוש שלב 4.
