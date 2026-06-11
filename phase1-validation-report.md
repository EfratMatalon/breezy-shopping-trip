# Phase 1 — Validation Report (Runtime)

| שדה | ערך |
|---|---|
| **שלב** | Phase 1 — אימות ריצה (runtime validation) |
| **סטטוס** | **חסום** — לא ניתן להריץ אימות מלא בסביבה הנוכחית |
| **דרישה** | `supabase db reset` + `rls_policies.test.sql` מול מסד נתונים אמיתי |

---

## 1. שלבי אימות שבוצעו

### שלב 1 — בדיקת זמינות כלים

```sh
node -v && npm -v
docker -v
which psql pg_ctl postgres
```

**תוצאה:**

| כלי | זמין? |
|---|---|
| Node.js v18.14.2 | ✅ כן |
| npm 9.5.0 | ✅ כן |
| Docker | ❌ לא מותקן (`docker: command not found`) |
| psql / pg_ctl / postgres | ❌ לא מותקנים |
| Supabase CLI | ❌ לא מותקן |

### שלב 2 — ניסיון התקנת Supabase CLI

```sh
npx --yes supabase --version
```

**תוצאה:** כשל.

```
npm ERR! code UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm ERR! errno UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm ERR! request to https://registry.npmjs.org/supabase failed,
reason: unable to verify the first certificate
```

**גורם:** סביבת העבודה נמצאת מאחורי proxy/SSL interception (יש גישת אינטרנט בסיסית ל-`https://github.com`, אך ל-npm registry יש כשל אימות תעודה). לא בוצע מעקף של אימות SSL (`strict-ssl=false`), שכן זהו שינוי תצורה גלובלי שחורג מהיקף המשימה ומהווה סיכון אבטחה.

### שלב 3 — `supabase db reset`

**לא בוצע.** גם אילו הותקן ה-CLI בהצלחה, הפקודה `supabase start` / `supabase db reset` דורשת **Docker** להרצת מכולות Postgres/Realtime/Auth מקומיות — ו-Docker אינו מותקן בסביבה זו.

### שלב 4 — הרצת `supabase/tests/rls_policies.test.sql`

**לא בוצע** — תלוי בשלב 3 (נדרש מסד נתונים פעיל להרצת הסקריפט מול `psql`).

---

## 2. פקודות שהורצו

```sh
node -v
npm -v
docker -v
which psql pg_ctl postgres
npx --yes supabase --version
```

כל הפקודות הורצו מתוך תיקיית `breezy-shopping-trip/`. שום פקודת כתיבה/migration לא הורצה מול מסד נתונים, מאחר שלא קיים מסד נתונים זמין.

---

## 3. תוצאות בדיקה

| בדיקה נדרשת | סטטוס | הערה |
|---|---|---|
| התקנת/הגדרת Supabase CLI | ❌ נחסם | כשל אימות SSL מול npm registry |
| `supabase db reset` ממסד נקי | ❌ לא בוצע | תלוי ב-Docker, לא מותקן |
| הרצת `rls_policies.test.sql` | ❌ לא בוצע | תלוי במסד נתונים פעיל |
| יצירת טבלאות | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד (ר' סעיף 4) |
| יצירת אינדקסים | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד |
| הפעלת RLS | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד |
| יצירת RPC functions | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד |
| טעינת seed products | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד |
| הגדרת Realtime publication | ⚠️ לא אומת בריצה | אומת **סטטית** בלבד |

---

## 4. אימות סטטי שבוצע (תחליף חלקי, לא מספק)

מאחר שלא ניתן היה להריץ את המיגרציות, בוצעה קריאה חוזרת ידנית של כל 7 קבצי המיגרציה ב-`supabase/migrations/` כדי לוודא עקביות פנימית:

- ✅ סדר הפעלה תקין: extensions/helpers → tables → indexes → RLS → RPCs → seed → realtime.
- ✅ כל הטבלאות שנדרשות ע"י helper functions (`households`, `household_members`, `shopping_lists`, `profiles`) מוגדרות ב-`00002`.
- ✅ כל הטבלאות (8) כוללות `alter table ... enable row level security` ב-`00002`.
- ✅ כל טבלה (8/8) כוללת לפחות policy אחד ב-`00004`.
- ✅ קובץ `00006` מכיל 70 שורות `VALUES` (נספרו ידנית).
- ✅ `00007` מכיל `alter publication supabase_realtime add table public.shopping_items;`.
- ✅ כל 7 ה-RPC/helper functions הנבדקים ב-`rls_policies.test.sql` מוגדרים בפועל ב-`00001`/`00005`.

**חשוב:** בדיקה סטטית **אינה** מחליפה הרצה אמיתית. היא אינה מזהה שגיאות תחביר SQL בזמן ריצה, התנגשויות תלות (object dependency order), שגיאות RLS recursion, או בעיות runtime ב-`security definer`/`set_config`.

---

## 5. כשלים שזוהו

| # | כשל | חומרה |
|---|---|---|
| 1 | לא ניתן להתקין Supabase CLI (כשל SSL מול npm registry) | חוסם |
| 2 | Docker לא מותקן — נדרש להרצת `supabase start`/`db reset` | חוסם |
| 3 | psql/Postgres לא זמינים כחלופה להרצת `rls_policies.test.sql` | חוסם |

לא נמצאו פגמים **בקוד המיגרציות עצמו** — הכשלים הם אך ורק תשתיתיים (סביבתיים), ולא תוצאה של שגיאה ב-SQL שנכתב ב-Phase 1.

---

## 6. תיקונים שבוצעו

**לא בוצע אף תיקון קוד.** מאחר שלא זוהתה שום שגיאה במיגרציות עצמן (רק חוסם סביבתי), אין שינוי להחיל. בהתאם להנחיות, לא בוצע שום שינוי קוד/קובץ פרט ליצירת דוח זה.

---

## 7. סטטוס אימות סופי

**🔴 לא הושלם — נדרשת הרצה בסביבה עם Docker זמין.**

האימות הריצתי המלא **לא בוצע** ולא ניתן לאשר באופן חד-משמעי שהמיגרציות רצות בהצלחה מול מסד Postgres אמיתי. הסכימה, ה-RLS, ה-RPCs וה-seed עברו **סקירה סטטית** מלאה ונראים תקינים ועקביים, אך זהו **אינו תחליף** לקריטריוני האימות שהוגדרו ב-PLAN.md.

### צעדים נדרשים להשלמת האימות (לביצוע בסביבה מתאימה)

יש להריץ את הפקודות הבאות בסביבה עם **Docker Desktop** פעיל וגישה תקינה ל-npm registry:

```sh
cd breezy-shopping-trip
npm install            # מתקין @supabase/supabase-js + supabase CLI מ-package.json
npm run supabase:start # מעלה מכולות Postgres/Auth/Realtime/Studio מקומיות
npm run supabase:reset # מריץ supabase db reset — מחיל את כל 7 המיגרציות ממסד נקי
npm run supabase:test  # מריץ supabase/tests/rls_policies.test.sql מול psql
```

תוצאה צפויה מ-`supabase:test` (לפי `rls_policies.test.sql`):

```
NOTICE: PASS: RLS enabled on all Phase 1 tables
NOTICE: PASS: every Phase 1 table has at least one policy
NOTICE: PASS: system product catalog seeded (70 rows)
NOTICE: PASS: household_members has UNIQUE(user_id)
NOTICE: PASS: one-active-list-per-household index exists
NOTICE: PASS: shopping_items is in supabase_realtime publication
NOTICE: PASS: all helper functions and RPCs exist
NOTICE: ALL CHECKS PASSED
```

לאחר מכן מומלץ גם:
- בדיקת RLS דו-משתמשית (cross-household isolation) עם שני JWT שונים — לא קיימת עדיין, מתוכננת ל-Phase 7.
- בדיקת Realtime Inspector ב-Supabase Studio (`http://localhost:54323`) לוידוא קליטת אירועי INSERT/UPDATE על `shopping_items`.

---

**הדוח הושלם. לא בוצע שינוי קוד. Phase 2 לא הותחל — ממתין לסקירה ולהרצת האימות בסביבה מתאימה.**
