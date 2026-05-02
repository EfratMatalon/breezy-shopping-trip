import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דף הבית — רשימת קניות" },
      { name: "description", content: "פתחו רשימה חדשה או הציצו ברשימות קודמות." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="flex flex-col items-center text-center py-20">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">ברוכים הבאים</span>
      <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
        הקניות שלכם, פשוט וקל.
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        בנו רשימה, סמנו פריטים תוך כדי הקנייה, ושמרו היסטוריה של כל מה שקניתם.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/workspace"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          לרשימה שלי
        </Link>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          צפייה בהיסטוריה
        </Link>
      </div>

      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {[
          { t: "תכנון", d: "הוסיפו פריטים וכמויות לרשימה חדשה." },
          { t: "קנייה", d: "סמנו פריטים בזמן אמת תוך כדי הקנייה." },
          { t: "שמירה", d: "שמרו רשימות שהושלמו לעיון בעתיד." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border border-border bg-card p-6 text-right">
            <h3 className="text-sm font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
