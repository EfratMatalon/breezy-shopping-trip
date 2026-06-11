# דוח מוכנות ותוכנית יישום — Phase 3 (Household Lifecycle)

| שדה | ערך |
|---|---|
| **סטטוס** | ממתין לאישור — אין ליישם עד אישור מפורש |
| **תלות** | Phase 1 (DB/RLS/RPCs) ✅ מאושר ומבוצע, Phase 2 (Auth/Route Guards) ✅ מאושר ומבוצע |
| **מקור אמת** | `PLAN.md` (סעיף Phase 3), `shopping-pal-phase1-design.md` |

---

## 1. סקירת מצב קיים מול הנדרש

### מה כבר קיים (מ-Phase 1+2)
- כל ה-RPCs הדרושים כבר קיימים ב-`supabase/migrations/00005_rpc_functions.sql`: `create_household`, `join_household_by_code`, `regenerate_invite_code`, `leave_household`.
- `AuthProvider` + `useAuth`/`useSession` פעילים, מספקים `session`/`user`.
- `requireAuth`/`requireGuest` קיימים ב-`src/lib/auth/requireAuth.ts`.
- `getQueryClient()` מוכן לשימוש ע"י React Query.
- `Database` types ב-`src/lib/supabase/types.ts` כבר כוללים את כל הטבלאות והפונקציות הרלוונטיות (`households`, `household_members`, RPCs).

### מה חסר (היקף Phase 3)
- אין עדיין שום קוד שבודק אם למשתמש יש חברות בבית (household_members).
- אין guard בשם `requireHousehold`/`requireNoHousehold`.
- אין מסכי onboarding/join/settings.
- אין React Query hooks/queries לבית/חברות.
- `Nav.tsx` לא מציג קישור הגדרות בית.
- אין מנגנון "pending invite" לזרימת הצטרפות לפני login.

---

## 2. תרשים זרימה — יצירת בית (Household Creation Flow)

```
משתמש מחובר, ללא household_members
   │
   ▼
/onboarding  (requireAuth + requireNoHousehold)
   │
   ├─ בוחר "צור בית חדש" → מזין שם
   │        │
   │        ▼
   │  useCreateHousehold() → supabase.rpc("create_household", { p_name })
   │        │
   │        ├─ הצלחה:
   │        │     - household_members נוצר (created_by = auth.uid())
   │        │     - shopping_lists (active) נוצר
   │        │     - seed_recurring_items רץ (ריק ב-Phase זה, לפי Open Q #2)
   │        │     - invite_code מוחזר
   │        │     → invalidate query "myHousehold"
   │        │     → ניווט ל-/  (workspace dashboard)
   │        │     → הצגת invite_code/קישור למשתמש (חד-פעמי, ניתן לצפייה גם ב-settings)
   │        │
   │        └─ שגיאה ALREADY_IN_HOUSEHOLD → הודעה בעברית, ניווט ל-/
   │
   └─ בוחר "הצטרף לבית קיים" → ראה זרימת הצטרפות (סעיף 3)
```

---

## 3. תרשים זרימה — הצטרפות לבית (Join Household Flow)

### 3.א קוד הזמנה ידני (`/join`)

```
משתמש (מחובר או לא) → /join
   │
   ├─ לא מחובר → requireAuth מפנה ל-/login
   │       (אין pending code לשמור — המשתמש מזין קוד אחרי login)
   │
   ▼
מחובר, ללא household → מזין קוד הזמנה (8 תווים, Crockford Base32)
   │
   ▼
useJoinHousehold(code) → supabase.rpc("join_household_by_code", { p_code: code })
   │
   ├─ הצלחה (חבר חדש) → invalidate "myHousehold" → ניווט ל-/
   ├─ הצלחה אידמפוטנטית (כבר חבר באותו בית) → ניווט ל-/ (ללא שגיאה)
   ├─ NOT_FOUND (קוד לא קיים) → הודעת שגיאה בעברית "קוד הזמנה לא תקין"
   └─ ALREADY_IN_HOUSEHOLD (חבר בבית אחר) → הודעה: "יש לעזוב את הבית הנוכחי לפני הצטרפות לבית אחר" + קישור ל-/settings/household
```

### 3.ב קישור הזמנה (`/join/$code`)

```
מבקר (לא מחובר) → /join/{code}
   │
   ├─ requireAuth מפעיל redirect ל-/login
   │       לפני ה-redirect: שמירת {code} ב-sessionStorage (key: "shopping-pal:pending-invite")
   │
   ▼
לאחר login → /auth/callback → ניווט חזרה ל-/join/{code}
   │   (auth.callback.tsx: אם קיים pending invite ב-sessionStorage,
   │    מנווט ל-/join/{code} במקום ל-/ )
   │
   ▼
/join/$code (מחובר עכשיו)
   │
   ▼
אותה לוגיקה כמו 3.א, עם code מה-URL params (לא קלט ידני)
   │
   ▼
לאחר RPC (הצלחה/idempotent/שגיאה) → ניקוי sessionStorage pending invite
```

**הערה:** אם למשתמש המחובר כבר יש household (כל household — כולל זה שאליו מנסה להצטרף), הדף `/join` ו-`/join/$code` עדיין נגישים (אין `requireNoHousehold` עליהם), כי ייתכן שינסה להצטרף לבית אחר ויקבל שגיאת `ALREADY_IN_HOUSEHOLD` עם הסבר — זו ההתנהגות התואמת את ה-RPC הקיים. לחלופין: אם יש כבר household זהה לקוד שניתן — תוצג הודעה "כבר חבר בבית הזה" וניווט ישיר ל-`/`.

---

## 4. תרשים זרימה — קוד הזמנה (Invite Code Flow — הצגה ורענון)

```
/settings/household  (requireAuth + requireHousehold)
   │
   ▼
useMyHousehold() → SELECT households via household_members join
   │
   ├─ מציג: שם הבית, invite_code נוכחי, קישור הזמנה (https://{host}/join/{invite_code})
   │        כפתור "העתק קישור" / "העתק קוד" (כל חבר)
   │
   └─ אם auth.uid() === households.created_by:
            מציג כפתור "צור קוד הזמנה חדש"
            │
            ▼
       useRegenerateInvite() → supabase.rpc("regenerate_invite_code", { p_household_id })
            │
            ├─ הצלחה → invalidate "myHousehold" → invite_code חדש מוצג מיידית
            │           הקוד הישן מפסיק לעבוד באופן מיידי (DB-level)
            │
            └─ FORBIDDEN (לא היוצר — לא אמור לקרות כי הכפתור מוסתר, אך מטופל) →
                   הודעת שגיאה בעברית
```

אם `auth.uid() !== created_by` — הכפתור "צור קוד הזמנה חדש" לא מוצג כלל (UI hide), בנוסף להגנת ה-RPC (`FORBIDDEN`) כהגנת עומק.

---

## 5. ניהול חברות (Membership Management)

### 5.א צפייה ברשימת חברים (אופציונלי בתצוגה, ללא ניהול הדדי)

```
/settings/household
   │
   ▼
שאילתה: SELECT profiles.display_name, profiles.email, household_members.joined_at
        FROM household_members JOIN profiles ON ...
        WHERE household_id = myHousehold.id
   │
   ▼
מוצגת רשימת חברים (קריאה בלבד) — ללא כפתור "הסר חבר" (ADR-18, מחוץ להיקף)
```

### 5.ב עזיבת בית (`leave_household`)

```
/settings/household
   │
   ▼
כפתור "עזוב בית" (לכל חבר, כולל היוצר)
   │
   ▼
דיאלוג אישור (confirm) — הבהרה: "תאבד גישה לרשימה המשותפת"
   │
   ▼
useLeaveHousehold() → supabase.rpc("leave_household")
   │
   ├─ הצלחה → invalidate "myHousehold" (יחזיר null)
   │           → ניווט ל-/onboarding
   │           (household עצמו ושאר הנתונים נשארים ב-DB — orphan מותר, ADR-19)
   │
   └─ שגיאה (לא אמור לקרות אם יש household) → הודעה כללית
```

**הערה לגבי `created_by` לאחר עזיבת היוצר:** לפי ה-design, `created_by` הוא immutable ואינו מועבר. אם היוצר עוזב, אף אחד לא יוכל לבצע `regenerate_invite_code` בעתיד עבור אותו בית — זהו tradeoff מתועד ומאושר (Phase 1 design, לא בהיקף Phase 3 לפתור).

---

## 6. Route Guards חדשים נדרשים

| Guard | מיקום | התנהגות |
|---|---|---|
| `requireHousehold` | `/`, `/workspace`, `/history`, `/settings/household` | קורא `myHousehold` query; אם `null` → `redirect({ to: "/onboarding" })` |
| `requireNoHousehold` | `/onboarding` | אם יש household → `redirect({ to: "/" })` |

שני ה-guards, כמו `requireAuth`/`requireGuest` הקיימים, יהיו **no-op אם `!isSupabaseConfigured`** — שמירה על אותו דפוס graceful degradation שאומץ ב-Phase 2.

**מימוש טכני:** מאחר ש-`beforeLoad` הוא לא-React, לא ניתן להשתמש ב-React Query hook ישירות. הגישה: שימוש ב-`queryClient.fetchQuery` (עם `getQueryClient()`) בתוך ה-guard, עם `queryKey: ["myHousehold", userId]`, כך שהתוצאה תיכנס ל-cache ותשמש מיידית גם ב-`useMyHousehold()` ברכיב.

---

## 7. קבצים שייווצרו

| קובץ | תיאור |
|---|---|
| `src/lib/queries/queryKeys.ts` | מפתחות query מרכזיים: `["myHousehold", userId]`, `["householdMembers", householdId]` |
| `src/lib/queries/households.ts` | פונקציות fetch + עטיפות RPC: `fetchMyHousehold`, `fetchHouseholdMembers`, `createHousehold`, `joinHouseholdByCode`, `regenerateInviteCode`, `leaveHousehold` |
| `src/lib/household/HouseholdProvider.tsx` | קונטקסט שמספק `household`, `membership`, `isCreator`, `loading` — עוטף את האפליקציה אחרי `AuthProvider` |
| `src/lib/household/useMyHousehold.ts` | hook המבוסס על React Query (`useQuery`) לקבלת הבית הנוכחי |
| `src/lib/household/pendingInvite.ts` | ניהול `sessionStorage` עבור invite code שממתין ל-resume לאחר login |
| `src/routes/onboarding.tsx` | מסך "צור בית" / "הצטרף לבית" — `beforeLoad: [requireAuth, requireNoHousehold]` |
| `src/routes/join.tsx` | קלט קוד ידני — `beforeLoad: requireAuth` |
| `src/routes/join.$code.tsx` | זרימת קישור הזמנה — `beforeLoad: requireAuth`, שומר/קורא pending invite |
| `src/routes/settings.household.tsx` | הגדרות בית: שם, invite code (+regen ליוצר), רשימת חברים, "עזוב בית" — `beforeLoad: [requireAuth, requireHousehold]` |

---

## 8. קבצים שישונו

| קובץ | שינוי נדרש |
|---|---|
| `src/lib/auth/requireAuth.ts` | הוספת `requireHousehold` ו-`requireNoHousehold` (ראו סעיף 6) |
| `src/routes/__root.tsx` | הוספת `<HouseholdProvider>` בתוך `<AuthProvider>` (אחרי auth, לפני `AppStateProvider`) |
| `src/routes/index.tsx` | הוספת `requireHousehold` ל-`beforeLoad` (בנוסף ל-`requireAuth` הקיים) |
| `src/routes/workspace.tsx` | הוספת `requireHousehold` ל-`beforeLoad` |
| `src/routes/history.tsx` | הוספת `requireHousehold` ל-`beforeLoad` |
| `src/components/Nav.tsx` | הוספת קישור "הגדרות בית" (`/settings/household`) כאשר יש household; הצגת שם הבית |
| `src/routeTree.gen.ts` | עדכון ידני (כמו ב-Phase 2) להוספת `/onboarding`, `/join`, `/join/$code`, `/settings/household` |
| `src/routes/auth.callback.tsx` | בדיקת pending invite ב-sessionStorage לאחר קבלת session — אם קיים, ניווט ל-`/join/{code}` במקום `/`; אחרת ניווט ל-`/` כרגיל (ה-`requireHousehold`/`requireNoHousehold` ב-`/` ינתבו הלאה ל-`/onboarding` אם צריך) |

**לא ישתנה (מחוץ להיקף Phase 3):** `src/lib/store.tsx`, `src/lib/queries/items.ts`/`lists.ts` (Phase 4), לוגיקת cart/workspace UI עצמה (Phase 4).

---

## 9. סיכונים

| סיכון | השפעה | מיטיגציה |
|---|---|---|
| Pending invite אובד ב-redirect של OAuth (sessionStorage נמחק/נחסם) | משתמש מגיע ל-`/` במקום להצטרף לבית | `pendingInvite.ts` קורא/כותב ב-`sessionStorage` לפני ה-redirect ל-Google; `auth.callback.tsx` בודק זאת מיידית עם הטעינה |
| משתמש ינסה ליצור/להצטרף לבית בזמן שהוא כבר חבר בבית אחר | שגיאת `ALREADY_IN_HOUSEHOLD` מה-RPC | תרגום קוד השגיאה להודעה ברורה בעברית + הפניה ל-`/settings/household` לעזיבה |
| `requireHousehold`/`requireNoHousehold` ב-`beforeLoad` גורמים ל-double-fetch מול `useMyHousehold` ב-component | ביצועים/מחיקת cache | שימוש ב-`queryClient.fetchQuery` עם אותו `queryKey` כמו ב-`useMyHousehold` — תוצאת ה-guard נכנסת ל-cache ומונעת fetch כפול |
| חוסר סביבת Supabase מקושרת (כפי שתועד ב-Phase 1/2) — לא ניתן לבדוק RPCs בפועל | אין אימות end-to-end | Guards הם no-op כש-`!isSupabaseConfigured`; בדיקה תתבצע סטטית/קוד-review בלבד, כמו ב-Phase 1/2 |
| יוצר הבית עוזב — אף אחד לא יכול לרענן invite code יותר | תקוע אם הקוד דלף | מתועד כ-tradeoff מאושר ב-design (ADR-17/19); אין פתרון בהיקף Phase 3 |
| `routeTree.gen.ts` עדכון ידני נוסף (4 routes חדשים) | סיכון לשגיאת syntax/טעות העתקה | לעקוב במדויק אחר התבנית הקיימת מ-Phase 2; לבדוק בעזרת `tsc --noEmit` אם זמין |
| הצגת invite_code/קישור — חשיפת מידע רגיש בלוגים/screenshots | נמוך | להימנע מהדפסת invite_code ל-console; רק UI |

---

## 10. אסטרטגיית אימות (Validation Strategy)

לאור חסימות הסביבה שתועדו ב-`phase1-validation-report.md` ו-`phase2-implementation-report.md` (אין Docker/Supabase מקומי, `npm install` חסום ע"י `UNABLE_TO_VERIFY_LEAF_SIGNATURE`), האימות יתבסס על:

1. **בדיקה סטטית/קוד-review** — כל קובץ חדש/משונה ייבדק ידנית מול:
   - תבניות routing קיימות (`routeTree.gen.ts`, `createFileRoute`)
   - חתימות טיפוסים מול `Database` types (RPC params/returns תואמים ל-`types.ts`)
   - עקביות imports ונתיבים יחסיים

2. **התאמה למטריצת ה-validation criteria מ-PLAN.md (Phase 3)**, נבדקת לוגית מול הקוד (ללא ריצה):
   - יצירת בית → `household_members` + `created_by` + active list
   - הצטרפות דרך `/join/{code}` לאחר login → ניתוב ל-`/workspace`/`/`
   - הצטרפות בזמן חברות בבית אחר → הודעת `ALREADY_IN_HOUSEHOLD`
   - הצטרפות חוזרת לאותו בית → אידמפוטנטי
   - "צור קוד הזמנה חדש" — מוצג רק ל-`created_by`
   - קוד ישן לא תקף לאחר regen
   - `leave_household` → ניתוב ל-`/onboarding`
   - אין UI למחיקת בית/הסרת חבר

3. **ניסיון `npx tsc --noEmit`** — ייבדק שוב; אם עדיין חסום (כמו ב-Phase 2), יתועד כחסימת סביבה זהה, ללא עקיפת `strict-ssl`.

4. **דוח `phase3-implementation-report.md`** יתעד: קבצים שנוצרו/שונו, תוצאות הבדיקה הסטטית, חסימות, וסטטוס סופי (🟡/🟢/🔴) — באותו פורמט כמו דוחות Phase 1/2.

---

## הערות נוספות

- כל היקף Phase 3 שואב מ-RPCs קיימים מ-Phase 1 בלבד — **אין צורך במיגרציות DB חדשות**.
- ההיקף תואם את האילוצים הקשיחים מ-`PLAN.md`: ללא household switcher, ללא roles, ללא מחיקת household, ללא הסרת חבר אחר, ללא `invite_code_version`.
- שאלה פתוחה #2 מ-PLAN.md ("starter recurring set") — לפי ההמלצה ב-PLAN.md, **לא** ייושם ב-Phase 3 (יישאר ריק; recurring products יתווספו ב-Phase 5/settings).

---

*נוצר לקראת אישור. לא בוצע שינוי קוד, לא נוצרו migrations, לא הותקנו תלויות. ממתין לסקירה לפני תחילת יישום Phase 3.*
