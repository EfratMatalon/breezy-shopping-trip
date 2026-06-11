# דוח יישום שלב 3 — ניהול בית משק (Household)

## 1. קבצים שנוצרו

- `src/lib/queries/queryKeys.ts` — מפתחות React Query: `myHousehold(userId)`, `householdMembers(householdId)`.
- `src/lib/queries/households.ts` — שכבת גישה ל-Supabase: `fetchMyHousehold`, `fetchHouseholdMembers`, `createHousehold`, `joinHouseholdByCode`, `regenerateInviteCode`, `leaveHousehold`, `householdErrorMessage`.
- `src/lib/household/HouseholdProvider.tsx` — Context דק (thin wrapper) מעל `useQuery`, ללא state עצמאי. חושף `useHousehold()`.
- `src/lib/household/useMyHousehold.ts` — hook נוח שמשתמש ב-`useHousehold()` הקיים (אינו יוצר query נוסף).
- `src/lib/household/pendingInvite.ts` — ניהול הזמנה ממתינה ב-`sessionStorage` (`setPendingInvite`/`getPendingInvite`/`clearPendingInvite`).
- `src/routes/onboarding.tsx` — מסך הקמת בית חדש (למשתמשים ללא בית).
- `src/routes/join.tsx` — הצטרפות לבית באמצעות הזנת קוד הזמנה ידנית.
- `src/routes/join.$code.tsx` — הצטרפות לבית באמצעות קישור הזמנה (`/join/{code}`).
- `src/routes/settings.household.tsx` — מסך הגדרות בית: קוד הזמנה, חידוש קוד (ליוצר בלבד), רשימת חברים, עזיבת בית.

## 2. קבצים ששונו

- `src/lib/auth/requireAuth.ts` — נוספו `requireHousehold()` ו-`requireNoHousehold()`, המשתמשים ב-`getQueryClient().fetchQuery` עם אותו מפתח של `HouseholdProvider`.
- `src/routes/__root.tsx` — נוסף `HouseholdProvider` בין `AuthProvider` ל-`AppStateProvider`.
- `src/routes/index.tsx`, `src/routes/workspace.tsx`, `src/routes/history.tsx` — `beforeLoad` כולל כעת גם `requireHousehold()`.
- `src/components/Nav.tsx` — מציג את שם הבית וקישור ל"הגדרות בית" כאשר קיים בית למשתמש.
- `src/routes/auth.callback.tsx` — לאחר התחברות, אם קיימת הזמנה ממתינה (`pendingInvite`) מנתב ל-`/join/$code`, אחרת ל-`/`.
- `src/routeTree.gen.ts` — נרשמו 4 הנתיבים החדשים: `/onboarding`, `/join`, `/join/$code`, `/settings/household`, כולל עדכון כל הממשקים (`FileRoutesByFullPath`, `FileRoutesByTo`, `FileRoutesById`, `FileRouteTypes`, `RootRouteChildren`, `declare module`, `rootRouteChildren`).

## 3. יישום זרימת יצירת בית

`/onboarding` נגיש רק למשתמש מחובר שאין לו בית (`requireAuth` + `requireNoHousehold`). הטופס קורא ל-`createHousehold(name)` שמפעיל את ה-RPC `create_household`, מבטל (`invalidate`) את `queryKeys.myHousehold(userId)`, ו-`HouseholdProvider` מתעדכן אוטומטית עם הבית החדש. לאחר מכן ניווט ל-`/`.

## 4. יישום זרימת הצטרפות

- **קוד ידני** (`/join`): טופס עם שדה קוד (8 תווים, אותיות גדולות), קורא ל-`joinHouseholdByCode(code)`, מבטל את `myHousehold`, מנווט ל-`/`. במקרה שגיאת "כבר חבר בבית אחר" מוצג קישור ל"הגדרות הבית" עם אפשרות לעזוב.
- **קישור הזמנה** (`/join/$code`): אם המשתמש לא מחובר — נשמר הקוד ב-`sessionStorage` (`pendingInvite`) והמשתמש מועבר ל-`/login`. לאחר חזרה מ-`/auth/callback`, הקוד הממתין נשלף ומנותב חזרה ל-`/join/$code`, שם ה-RPC מופעל אוטומטית (`useEffect`).

## 5. יישום קוד הזמנה

קוד ההזמנה מוצג במסך `/settings/household` (`household.invite_code`) יחד עם קישור מלא (`/join/{code}`), עם כפתורי העתקה (`navigator.clipboard`). ליוצר הבית בלבד (`isCreator`) מוצג כפתור "צור קוד הזמנה חדש" שקורא ל-`regenerateInviteCode(householdId)` (RPC `regenerate_invite_code`, בודק הרשאת יוצר בצד השרת) ומבטל את `myHousehold` כדי לרענן את הקוד המוצג.

## 6. יישום ניהול חברות

`/settings/household` מציג רשימת חברי הבית (`fetchHouseholdMembers`, embedded `profiles`), מסומן עם "(אתם)" למשתמש הנוכחי ו"· יוצר הבית" ליוצר. כפתור "עזוב בית" מציג אישור (`confirm`) ולאחריו קורא ל-`leaveHousehold()` (RPC `leave_household`), מבטל `myHousehold`, ומנווט ל-`/onboarding`. בהתאם ל-ADR-18, אין אפשרות להסיר חברים אחרים.

## 7. תוצאות בדיקה (Validation)

- `npx tsc --noEmit` נכשל עם `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (אותה בעיית סביבה שתועדה בשלבים 1-2; `node_modules` לא מותקן, אין אישור לעקוף בדיקת SSL).
- בוצעה בדיקה ידנית/סטטית של כל הקבצים החדשים והמשונים מול טיפוסי `Database` (`src/lib/supabase/types.ts`) וחתימות ה-RPC ב-`00005_rpc_functions.sql` — תואמים.
- נבדקה התאמת `routeTree.gen.ts` לדפוס שנוצר בשלב 2 (אותם ממשקים, אותה מבנה `_addFileChildren`/`_addFileTypes`).
- לא בוצעו מיגרציות חדשות ולא נוספו שינויים מחוץ להיקף שלב 3.

## 8. סיכונים

- ללא יכולת הרצת build/דפדפן בסביבה זו, לא ניתן לוודא ויזואלית את הזרימות (יצירה/הצטרפות/עזיבה) מקצה לקצה.
- זרימת `pendingInvite` תלויה ב-`sessionStorage` — אם המשתמש פותח את קישור ההזמנה בטאב חדש לאחר ההתחברות, ייתכן שה-state לא יישמר (edge case נדיר).
- חוסר התאמה אפשרי בין שמות שדות ה-RPC (`household_id`, `invite_code`, `list_id`) לבין המימוש בפועל ב-DB — מבוסס על קריאת המיגרציה בלבד, לא נבדק מול DB חי.

## 9. מגבלות ידועות

- אין תמיכה ב-rate limiting על ניסיונות הצטרפות (נדחה בכוונה, כמתועד ב-PLAN.md).
- אין set ברירת מחדל של פריטים חוזרים בעת יצירת בית (נדחה לשלב 5).
- מסך הגדרות הבית אינו תומך בעריכת שם הבית (לא היה בהיקף שלב 3).
- כל ההתנהגות החדשה אינה פעילה כאשר `isSupabaseConfigured === false` (guards הם no-op), בהתאם לדפוס שלבים 1-2.

---

שלב 3 הושלם. ממתין לבדיקה ואישור לפני תחילת שלב 4.
