# דוח מימוש — שלב 4, Slice 2 (Shopping Workspace — קריאה בלבד)

## קבצים שנוצרו

- `src/lib/queries/products.ts` — `fetchProducts(householdId)`: קטלוג מערכת (`household_id IS NULL`) + מוצרי הבית, ממוין לפי קטגוריה ושם. טיפוס `Product`.

## קבצים ששונו

- `src/lib/queries/queryKeys.ts` — נוסף `products(householdId)`.
- `src/routes/workspace.tsx` — שכתוב מלא ל-read-only:
  - הוסרו `useAppState`, כל ה-handlers לכתיבה (`addSelectedItem`, `updateSelectedQuantity`, `addUserProduct`, `saveCurrentList`, `startNewCycle`, `dismissSuggestion` וכו'), העגלה הצדה הנפתחת, חיפוש/הוספה מהירה, מודאל Leftover, ומסך "סיום קנייה".
  - נשארו: רשת קטגוריות (`CATEGORY_ORDER`/אייקונים) הניתנת להרחבה ללא ערכי כתיבה — לחיצה רק פותחת/סוגרת תצוגה (`openCategory` הוא state UI-only מקומי).
  - כל מוצר בקטגוריה מציג, אם הוא ברשימה הפעילה: כמות (`×N`) ותג סטטוס (`pending`/`purchased`/`unavailable`).
  - נוספה רשימת "פריטים ברשימה" מסכמת מתחת לקטגוריות.

## Queries שמומשו

| Query | מקור | תנאי הפעלה |
|---|---|---|
| `fetchActiveList` | `queryKeys.activeList(householdId)` | `enabled: !!householdId` |
| `fetchListItems` | `queryKeys.listItems(listId)` | `enabled: !!listId` |
| `fetchProducts` | `queryKeys.products(householdId)` | `enabled: !!householdId` |

## בדיקות שבוצעו

- קריאה חוזרת של `00002_tables.sql`/`types.ts` לאימות עמודות `products.category`, `shopping_items.status`/`quantity`.
- אימות שה-`or()` filter ב-`fetchProducts` תואם למדיניות RLS `products_select` (מערכת + בית).
- בדיקה לוגית של מצבי הטעינה/ריק: `isLoading` (כל 3 השאילתות), "אין רשימה פעילה" (כש-`activeListQuery.data` הוא `null`), "הרשימה ריקה" (כש-`items.length === 0`), "אין מוצרים בקטגוריה" (per-category).
- **לא בוצעה הרצה בדפדפן/`npx tsc`** — `node_modules` לא מותקן (כמתועד קודם).

## הגבלות ידועות

- ללא בדיקת build/dev-server בפועל.
- אין טיפול בשגיאות (`error` מה-queries) — רק מצבי טעינה/ריק, כנדרש בהיקף.
- ה-UI הצר בהרבה מהעיצוב המקורי (אין עגלה צדית, חיפוש, הצעות, אנימציות) — בכוונה, כדי לעמוד ב"קריאה בלבד, ללא Add Item/mutations".
- לא מומשו: Add Item, מוטציות, Realtime, Slice 3.

**סטטוס:** Slice 2 הושלם. עוצר וממתין לבדיקה/אישור לפני Slice 3.
