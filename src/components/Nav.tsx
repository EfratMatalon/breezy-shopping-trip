import { Link } from "@tanstack/react-router";
import { LogOut, Settings, Clock } from "lucide-react";
import { useAuth } from "../lib/auth/AuthProvider";
import { useMyHousehold } from "../lib/household/useMyHousehold";

export function Nav() {
  const linkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const activeProps = { className: "text-sm font-medium text-foreground" };
  const { user, isConfigured, signOut } = useAuth();
  const { household } = useMyHousehold();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-base font-semibold tracking-tight">
          רשימת קניות
          {household && (
            <span className="mr-2 text-xs font-normal text-muted-foreground">
              · {household.name}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/history" className={`${linkClass} flex items-center gap-1.5`} activeProps={activeProps}>
            <Clock className="h-4 w-4" />
            היסטוריה
          </Link>
          {household && (
            <Link to="/settings/household" className={`${linkClass} flex items-center gap-1.5`} activeProps={activeProps}>
              <Settings className="h-4 w-4" />
              הגדרות בית
            </Link>
          )}
          {isConfigured ? (
            user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className={`${linkClass} flex items-center gap-1.5`}
              >
                <LogOut className="h-4 w-4" />
                התנתקות
              </button>
            ) : (
              <Link to="/login" className={linkClass} activeProps={activeProps}>
                התחברות
              </Link>
            )
          ) : null}
        </div>
      </nav>
    </header>
  );
}
