"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Header({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">PnL Calendar</h1>
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/dashboard"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/calendar"
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/calendar"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Calendar
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {displayName || email}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
