import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Calendar } from "@/components/calendar";
import { getTradesForMonth, getUserProfile } from "@/lib/actions/trades";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();
  const now = new Date();
  const trades = await getTradesForMonth(now.getFullYear(), now.getMonth());

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header
        email={user.email ?? ""}
        displayName={profile?.displayName ?? ""}
      />
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-4xl mx-auto px-4 py-4">
        <Calendar
          initialTrades={trades}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
        />
      </main>
    </div>
  );
}
