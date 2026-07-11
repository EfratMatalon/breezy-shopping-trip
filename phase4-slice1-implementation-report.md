# דוח מימוש — שלב 4, Slice 1 (Shopping Dashboard — קריאה בלבד)

## קבצים שנוצרו

- `src/lib/queries/lists.ts` — שכבת queries חדשה:
  - `fetchActiveList(householdId)` → `shopping_lists` עם `status='active'` (`maybeSingle`)
  - `fetchListItems(listId)` → `shopping_items` + `products(id, name, category)` (join), מסודר לפי `sort_order`
  - טיפוסים: `ShoppingList`, `ShoppingItem`, `Product`, `ShoppingItemWithProduct`

## קבצים ששונו

- `src/lib/queries/queryKeys.ts` — נוספו `activeList(householdId)` ו-`listItems(listId)`.
- `src/routes/index.tsx` — הדשבורד הוחלף מ-`useAppState`/localStorage לשני `useQuery` (רשימה פעילה + פריטיה), עם state טעינה/ריק חדשים.

## Queries שמומשו

| Query | מקור | תנאי הפעלה |
|---|---|---|
| `fetchActiveList` | `queryKeys.activeList(householdId)` | `enabled: !!householdId` (מ-`useMyHousehold`) |
| `fetchListItems` | `queryKeys.listItems(listId)` | `enabled: !!listId` (תלוי בתוצאת השאילתה הראשונה) |

## בדיקות שבוצעו

- קריאה סטטית של הקוד הקיים (`HouseholdProvider`, `useMyHousehold`, `households.ts`) לאימות תבנית `useQuery`/`queryKeys` עקבית.
- אימות מבנה הטבלאות/עמודות (`shopping_lists`, `shopping_items`, `products`) מול `00002_tables.sql` ו-`src/lib/supabase/types.ts`.
- אימות ש-`shopping_lists_one_active_per_household` מבטיח `maybeSingle` תקין (0 או 1 שורה).
- **לא בוצעה הרצה בדפדפן/`npx tsc`** — `node_modules` לא מותקן בסביבה (כפי שתועד בעבר, `npm install` חוסם עם `UNABLE_TO_VERIFY_LEAF_SIGNATURE`).

## הגבלות ידועות

- ללא בדיקת ריצה בפועל (build/tsc/dev server) — נדרש אימות בסביבה עם `node_modules` תקין.
- אין fallback ל-`activeListQuery.error`/`itemsQuery.error` (שגיאת רשת/RLS) — מוצג רק מצב טעינה/ריק; טיפול בשגיאות נדחה (לא בהיקף Slice 1 לפי הדרישות).
- `state`/`useAppState` (localStorage) עדיין בשימוש ב-`/workspace` וב-`/history` — לא נוגע ב-Slice זה.
- לא מומשו: mutations, Add Item, Realtime, Slice 2 — בהתאם להיקף.

**סטטוס:** Slice 1 הושלם. עוצר וממתין לבדיקה/אישור לפני Slice 2.
