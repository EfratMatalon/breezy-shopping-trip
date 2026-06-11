# Phase 1 — Implementation Report

| שדה | ערך |
|---|---|
| **שלב** | Phase 1 — Supabase foundation (schema, RLS, RPCs) |
| **סטטוס** | הושלם — ממתין לסקירה |
| **היקף** | סכימת DB, אינדקסים, RLS, פונקציות עזר, RPCs, seed, Realtime publication, תיעוד |
| **לא בוצע (בכוונה)** | Auth, Google OAuth, route protection, frontend integration, household UI, shared list UI |
| **שינויים ב-`src/**`** | אין |

---

## 1. קבצים שנוצרו

| קובץ | תיאור |
|---|---|
| `supabase/config.toml` | תצורת Supabase CLI מקומית (API/DB/Studio/Realtime) |
| `supabase/migrations/00001_extensions_and_helpers.sql` | extension `pgcrypto`, טריגר `set_updated_at`, `handle_new_user`, פונקציות עזר RLS |
| `supabase/migrations/00002_tables.sql` | כל 8 הטבלאות, RLS enabled, אינדקסים ייחודיים inline |
| `supabase/migrations/00003_indexes.sql` | אינדקסים תומכי ביצועים |
| `supabase/migrations/00004_rls_policies.sql` | כל מדיניות ה-RLS + טריגר הגנה על שדות households |
| `supabase/migrations/00005_rpc_functions.sql` | כל ה-RPCs + פונקציות פנימיות (`generate_invite_code`, `seed_recurring_items`) |
| `supabase/migrations/00006_seed_products.sql` | seed אידמפוטנטי של ~70 מוצרי מערכת ב-10 קטגוריות |
| `supabase/migrations/00007_realtime_publication.sql` | הוספת `shopping_items` ל-`supabase_realtime` |
| `supabase/tests/rls_policies.test.sql` | בדיקות SQL מבניות (RLS מופעל, policies קיימים, seed, RPCs קיימים) |
| `.env.example` | תבנית למשתני סביבה של Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| `docs/supabase-setup.md` | הוראות התקנה מקומית/remote, ללא OAuth (נדחה ל-Phase 2) |
| `phase1-implementation-report.md` | דוח זה |

## 2. קבצים שעודכנו

| קובץ | שינוי |
|---|---|
| `.gitignore` | הוספת `.env`, `.env.local`, `supabase/.branches`, `supabase/.temp` |
| `package.json` | הוספת `@supabase/supabase-js` (dependency), `supabase` CLI (devDependency), וסקריפטים `supabase:start` / `supabase:stop` / `supabase:reset` / `supabase:test` |

אף קובץ תחת `src/**` לא שונה.

---

## 3. החלטות ארכיטקטוניות מרכזיות

1. **סדר המיגרציות** — `00001` (helpers) קודם ל-`00002` (tables), כפי שנקבע ב-PLAN.md. ב-PostgreSQL, גוף פונקציית `plpgsql`/`sql` אינו מאומת מול קיום טבלאות בזמן `CREATE FUNCTION`, רק בזמן ריצה — לכן הסדר תקין.
2. **הגנה על שדות immutable ב-`households`** — נוסף טריגר `enforce_household_immutable_fields` שמונע שינוי ישיר של `invite_code`/`created_by`. ה-RPC `regenerate_invite_code` עוקף אותו דרך GUC זמני (`set_config('app.bypass_household_guard', 'on', true)`), כך ש-RLS מאפשר לכל חבר לעדכן שם household, אך רק היוצר יכול לרענן invite code (ADR-17).
3. **`shopping_items` INSERT policy מחמירה** — מותר רק לרשום פריט על רשימה שה-`status = 'active'` בנוסף לחברות ב-household, כדי למנוע כתיבה לרשימות `completed` (תואם להמלצת "stricter INSERT policy" ב-PLAN).
4. **Seed אידמפוטנטי** — `00006` משתמש ב-`WHERE NOT EXISTS` במקום `ON CONFLICT`, כי האינדקס הייחודי על `(household_id, normalized_name)` חל רק על שורות `household_id IS NOT NULL`. כך ה-seed בטוח להרצה חוזרת מבלי ליצור כפילויות מוצרי מערכת.
5. **`normalized_name`** — לשורות seed הוגדר שווה ל-`name` (ללא נורמליזציה נוספת בעברית). נורמליזציה מתקדמת (lower-casing, ניקוד) נדחית לפאזה שבה quick-add מהפרונט ייכתב.
6. **קוד הזמנה (`invite_code`)** — Crockford Base32 (8 תווים, ללא I/L/O/U) שנוצר בלולאה עד לייחודיות, כפי שצוין בסיכוני Phase 1.
7. **`complete_shopping_trip`** — מימוש מדויק של Appendix B: complete → list חדש → carry-over `unavailable`→`pending` → `seed_recurring_items` עם `ON CONFLICT (list_id, product_id) DO NOTHING` כדי לממש את כלל המיזוג (unavailable מנצח, recurring לא יוצר שורה כפולה).
8. **קודי שגיאה** — RPCs מעלים `raise exception` עם המחרוזות מהחוזה (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `ALREADY_IN_HOUSEHOLD`) ב-`message`, עם `errcode` תואם ככל האפשר, לצריכה עתידית מהפרונט.

---

## 4. בדיקות תקפות (Validation)

**הערה חשובה:** בסביבת העבודה הנוכחית **אין** Supabase CLI ו-**אין** Docker מותקנים, ולכן לא ניתן היה להריץ בפועל `supabase db reset` או `psql` מול מסד נתונים אמיתי.

מה שכן בוצע:

- ✅ סקירה ידנית של כל 7 קבצי המיגרציה לסדר תלות נכון (extensions/helpers → tables → indexes → RLS → RPCs → seed → realtime).
- ✅ אימות שכל הטבלאות שמוזכרות ב-helper functions וב-RLS אכן מוגדרות ב-`00002`.
- ✅ אימות שכל ה-RPCs וה-helper functions שמוזכרים בבדיקת `rls_policies.test.sql` אכן מוגדרים ב-`00001`/`00005`.
- ✅ אימות שמספר המוצרים ב-seed הוא 70 (נספר ידנית מול `DEFAULT_CATALOG`).
- ✅ אימות ש-`shopping_items` נוסף ל-`supabase_realtime` ב-`00007`.
- ⚠️ **לא בוצע** (דורש סביבה עם Docker/Supabase CLI):
  - `supabase db reset` בפועל
  - `supabase/tests/rls_policies.test.sql` בפועל
  - בדיקת RLS עם שני JWT שונים (cross-household isolation)
  - בדיקת Realtime inspector

**המלצה:** להריץ `npm run supabase:start && npm run supabase:test` בסביבה עם Docker זמין כדי לאשר את הקריטריונים הפורמליים מ-PLAN.md לפני מעבר ל-Phase 2.

---

## 5. סיכום מיגרציות

| # | קובץ | תוכן עיקרי |
|---|---|---|
| 00001 | extensions_and_helpers | `pgcrypto`; `set_updated_at()`; `handle_new_user()` + טריגר על `auth.users`; `is_household_member`, `my_household_id`, `is_household_creator`, `household_id_for_list` |
| 00002 | tables | 8 טבלאות + RLS enabled + טריגרי `updated_at` על `profiles`, `households`, `shopping_items` + אינדקסים ייחודיים inline (`products` normalized name, `shopping_lists` one-active) |
| 00003 | indexes | 8 אינדקסים תומכי שאילתות (members, lists, items, products, invite_code, recurring) |
| 00004 | rls_policies | מדיניות SELECT/INSERT/UPDATE/DELETE לכל טבלה + טריגר הגנה על `households.invite_code`/`created_by` |
| 00005 | rpc_functions | `generate_invite_code`, `seed_recurring_items`, `create_household`, `join_household_by_code`, `regenerate_invite_code`, `leave_household`, `complete_shopping_trip` |
| 00006 | seed_products | ~70 מוצרי מערכת ב-10 קטגוריות, idempotent |
| 00007 | realtime_publication | `shopping_items` ב-`supabase_realtime` |

---

## 6. סיכום מדיניות RLS

| טבלה | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | עצמי + שותפי household | עצמי | עצמי | — |
| `households` | חברי household | — (RPC בלבד) | כל חבר (invite_code/created_by מוגנים בטריגר) | — |
| `household_members` | חברי household | — (RPC בלבד) | — | — (RPC בלבד) |
| `products` | מערכת + household שלי | כל חבר (household שלי) | כל חבר (household שלי) | כל חבר (household שלי, לא מערכת) |
| `shopping_lists` | חברי household | — (RPC בלבד) | — (RPC בלבד) | — |
| `shopping_items` | חברי household של הרשימה | חבר + רשימה `active` בלבד | חבר | חבר |
| `recurring_products` | חברי household | כל חבר | כל חבר | כל חבר |
| `suggestion_dismissals` | עצמי | עצמי (household שלי) | — | עצמי |

---

## 7. סיכום פונקציות RPC ו-Helper

### Helper functions (SECURITY DEFINER, STABLE)

| פונקציה | מטרה |
|---|---|
| `is_household_member(household_id)` | בדיקת חברות ב-household |
| `my_household_id()` | ה-household היחיד של המשתמש הנוכחי |
| `is_household_creator(household_id)` | האם המשתמש הוא יוצר ה-household |
| `household_id_for_list(list_id)` | פתרון household עבור רשימה (ל-RLS של `shopping_items`) |
| `generate_invite_code()` | יצירת קוד הזמנה ייחודי (Crockford Base32, 8 תווים) |
| `set_updated_at()` / `handle_new_user()` | טריגרים תומכים |

### RPCs (SECURITY DEFINER, `auth.uid()` checks)

| RPC | התנהגות |
|---|---|
| `create_household(name)` | יוצר household + חברות + רשימה פעילה + seed recurring; נכשל אם כבר חבר ב-household (`ALREADY_IN_HOUSEHOLD`) |
| `join_household_by_code(code)` | מצטרף לפי קוד; אידמפוטנטי אם כבר חבר באותו household; נכשל (`ALREADY_IN_HOUSEHOLD`) אם חבר ב-household אחר; `NOT_FOUND` אם הקוד לא קיים |
| `regenerate_invite_code(household_id)` | רק היוצר (`FORBIDDEN` אחרת); מחליף `invite_code` |
| `leave_household()` | מוחק את שורת החברות של הקורא בלבד (`NOT_FOUND` אם אין חברות) |
| `complete_shopping_trip(household_id)` | משלים רשימה פעילה, יוצר רשימה חדשה, מעביר `unavailable`→`pending`, מוסיף recurring (עם כלל מיזוג), מחזיר `list_id` חדש |
| `seed_recurring_items(list_id)` | פנימי — מוסיף פריטי recurring מופעלים לרשימה, `ON CONFLICT DO NOTHING` |

---

## 8. נקודות פתוחות ל-Phase 2 ואילך (לידיעה בלבד — לא מטופלות כעת)

- חיווט `@supabase/supabase-js` בפרונט, `AuthProvider`, `requireAuth`.
- Google OAuth + redirect URLs.
- בדיקות RLS עם שני משתמשים אמיתיים (two-JWT cross-household isolation).
- הרצת `supabase db reset` ו-`supabase:test` בסביבה עם Docker.

---

**Phase 1 הושלם. לא בוצעו שינויים ב-`src/**`, לא הוגדר Auth, לא בוצעה אינטגרציה לפרונטאנד. ממתין לסקירה לפני תחילת Phase 2.**
