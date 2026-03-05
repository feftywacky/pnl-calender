import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart2, CalendarDays, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-base font-semibold tracking-tight">
            PnL Calendar
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight leading-tight sm:text-6xl">
              Know exactly where you stand,{" "}
              <span className="text-green-600">every trading day.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              PnL Calendar is a simple, focused journal for traders. Log your
              trades, track your exits, and watch your performance come into
              focus.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/login">Start Tracking Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 text-left">
            <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Calendar View</h3>
              <p className="text-sm text-muted-foreground">
                See every trading day at a glance. Green days, red days — no
                hiding from the numbers.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Cumulative PnL</h3>
              <p className="text-sm text-muted-foreground">
                Track your running total across all time. Spot trends before
                they become habits.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Performance Stats</h3>
              <p className="text-sm text-muted-foreground">
                Win rate, average win vs loss, monthly breakdowns — the numbers
                that actually matter.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-muted-foreground">
          <span>PnL Calendar</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
