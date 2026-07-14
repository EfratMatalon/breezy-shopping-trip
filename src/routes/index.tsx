import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});

function Home() {
  const { household } = useMyHousehold();
  const householdId = household?.id;

  const activeListQuery = useQuery({
    queryKey: queryKeys.activeList(householdId),
    queryFn: () => fetchActiveList(householdId!),
    enabled: !!householdId,
  });

  const listId = activeListQuery.data?.id;

  const itemsQuery = useQuery({
    queryKey: queryKeys.listItems(listId),
    queryFn: () => fetchListItems(listId!),
    enabled: !!listId,
  });

  const isLoading = activeListQuery.isLoading || (!!listId && itemsQuery.isLoading);
  const items = itemsQuery.data ?? [];
  const hasActive = items.length > 0;
  const previewNames = items.slice(0, 3).map((i) => i.product?.name).filter(Boolean) as string[];
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
      <h2 className="text-lg font-medium text-muted-foreground">
        מה צריך לקנות השבוע?
      </h2>
      <Link
        to="/workspace"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-primary to-[var(--primary-glow)] px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-all duration-200 hover:shadow-md hover:brightness-105 active:scale-[0.98]"
      >
        רשימה חדשה
      </Link>
      <Link
        to="/history"
        className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        רשימות קודמות
      </Link>

      {isLoading && (
        <div className="mt-8 w-full max-w-md rounded-2xl border border-border/60 bg-card/60 p-5 text-center text-sm text-muted-foreground shadow-sm">
          טוען רשימה פעילה…
        </div>
      )}

      {!isLoading && !activeListQuery.data && (
        <div className="mt-8 w-full max-w-md rounded-2xl border border-dashed border-border/60 bg-card/60 p-5 text-center text-sm text-muted-foreground shadow-sm">
          לא נמצאה רשימת קניות פעילה.
        </div>
      )}

      {!isLoading && activeListQuery.data && !hasActive && (
        <div className="mt-8 w-full max-w-md rounded-2xl border border-dashed border-border/60 bg-card/60 p-5 text-center text-sm text-muted-foreground shadow-sm">
          הרשימה הפעילה ריקה — לחצו על "רשימה חדשה" כדי להוסיף מוצרים.
        </div>
      )}

      {!isLoading && hasActive && (
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
              {items.length > previewNames.length && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  +{items.length - previewNames.length} נוספים
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
