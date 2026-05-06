import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppState } from "@/lib/store";
import { ShoppingBasket } from "lucide-react";

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
  const { state, getProduct } = useAppState();
  const hasActive = state.selectedItems.length > 0;
  const previewNames = state.selectedItems
    .slice(0, 3)
    .map((i) => getProduct(i.productId)?.name)
    .filter(Boolean) as string[];
  const totalQty = state.selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
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

      {hasActive && (
        <Link
          to="/workspace"
          className="mt-8 w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-5 text-right shadow-md backdrop-blur transition-all hover:shadow-lg hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold text-foreground">
                כבר התחלת רשימה
              </div>
              <div className="text-xs text-muted-foreground">
                {totalQty} פריטים ברשימה הפעילה
              </div>
            </div>
          </div>

          {previewNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previewNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-secondary/70 px-3 py-1 text-xs text-secondary-foreground"
                >
                  {name}
                </span>
              ))}
              {state.selectedItems.length > previewNames.length && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  +{state.selectedItems.length - previewNames.length} נוספים
                </span>
              )}
            </div>
          )}

          <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform hover:bg-primary/90 active:scale-[0.98]">
            המשך רשימה
          </div>
        </Link>
      )}
    </section>
  );
}
