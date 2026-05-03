import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "רשימת קניות" },
      { name: "description", content: "פתיחת רשימת קניות חדשה." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h2 className="text-lg font-medium text-muted-foreground">
        מה צריך לקנות השבוע?
      </h2>
      <Link
        to="/workspace"
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-14 py-7 text-2xl font-bold text-primary-foreground shadow-xl transition-transform hover:bg-primary/90 hover:scale-[1.02]"
      >
        רשימה חדשה
      </Link>
      <Link
        to="/history"
        className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        רשימות קודמות
      </Link>
    </section>
  );
}
