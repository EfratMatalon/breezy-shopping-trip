import { Link } from "@tanstack/react-router";

export function Nav() {
  const linkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const activeProps = { className: "text-sm font-medium text-foreground" };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-base font-semibold tracking-tight">
          רשימת קניות
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass} activeProps={activeProps} activeOptions={{ exact: true }}>
            דף הבית
          </Link>
          <Link to="/workspace" className={linkClass} activeProps={activeProps}>
            הרשימה שלי
          </Link>
          <Link to="/history" className={linkClass} activeProps={activeProps}>
            היסטוריה
          </Link>
        </div>
      </nav>
    </header>
  );
}
