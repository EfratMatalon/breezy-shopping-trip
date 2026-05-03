import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דף הבית — רשימת קניות" },
      { name: "description", content: "ניהול רשימת קניות חכמה — פתחו רשימה חדשה או הציצו ברשימות קודמות." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        ניהול רשימת קניות חכמה
      </h1>
      <div className="mt-12 flex flex-col items-center gap-4">
        <Link
          to="/workspace"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-10 py-5 text-lg font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          רשימה חדשה
        </Link>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          רשימות קודמות
        </Link>
      </div>
    </section>
  );
}
