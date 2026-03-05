import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Dashboard } from "@/components/dashboard";
import { getAllTrades, getUserProfile } from "@/lib/actions/trades";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, trades] = await Promise.all([
    getUserProfile(),
    getAllTrades(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        email={user.email ?? ""}
        displayName={profile?.displayName ?? ""}
      />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        <Dashboard
          displayName={profile?.displayName ?? ""}
          trades={trades}
        />
      </main>
    </div>
  );
}
