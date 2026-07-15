import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { isSupabaseConfigured, sessionReady, supabase } from "../lib/supabase/client";
import { getQueryClient } from "../lib/queryClient";
import { queryKeys } from "../lib/queries/queryKeys";
import { fetchMyHousehold } from "../lib/queries/households";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!isSupabaseConfigured) return;

    await sessionReady;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const household = await getQueryClient().fetchQuery({
      queryKey: queryKeys.myHousehold(data.session.user.id),
      queryFn: () => fetchMyHousehold(data.session.user.id),
    });

    if (!household) {
      throw redirect({ to: "/onboarding" });
    }

    throw redirect({ to: "/workspace" });
  },
  head: () => ({
    meta: [
      { title: "Listo — משפחה אחת. רשימה אחת." },
      { name: "description", content: "עוזר הקניות החכם של המשפחה שלך." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div dir="rtl">
      <div className="relative w-full" style={{ height: "440px" }}>
        <img
          src="/images/hero-grocery.png"
          alt="עגלת קניות בסופרמרקט"
          className="h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,15,10,0) 30%, rgba(20,15,10,.75) 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-12 pb-9 text-center">
          <h1
            className="text-white drop-shadow-lg"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "52px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              textShadow: "0 2px 12px rgba(0,0,0,.3)",
            }}
          >
            Listo
          </h1>
          <p className="mt-2 text-[19px] font-medium leading-relaxed text-[#F5EFE8]">
            משפחה אחת. רשימה אחת. תמיד מסונכרנים.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-14 pt-10">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-6 text-center">
          <p className="text-[15px] leading-relaxed text-[#9E9E9E]">
            נהל את רשימת הקניות המשפחתית שלך בצורה פשוטה, חכמה ומשותפת.
          </p>

          <div className="mt-1 flex items-center gap-3">
            <Link
              to="/register"
              className="rounded-[14px] bg-[#B5652F] px-10 py-3.5 text-[17px] font-bold text-white shadow-[0_4px_16px_rgba(181,101,47,.28)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              הירשם
            </Link>
            <Link
              to="/login"
              className="rounded-[14px] border-[1.5px] border-[#B5652F] bg-white px-10 py-3.5 text-[17px] font-bold text-[#B5652F] transition-all duration-200 hover:bg-[#B5652F]/5 active:scale-[0.98]"
            >
              התחבר
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
