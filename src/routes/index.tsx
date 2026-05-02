import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — ShopList" },
      { name: "description", content: "Start a new shopping list or review past ones." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <section className="flex flex-col items-center text-center py-20">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">Welcome</span>
      <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
        Your shopping, simplified.
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        Build a list, check items off as you shop, and keep a history of everything you've bought.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/workspace"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open Workspace
        </Link>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          View History
        </Link>
      </div>

      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {[
          { t: "Plan", d: "Add items and quantities to a fresh list." },
          { t: "Shop", d: "Tick items off in real time as you go." },
          { t: "Save", d: "Archive completed lists for later." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border border-border bg-card p-6 text-left">
            <h3 className="text-sm font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
