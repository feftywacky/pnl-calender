"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import type { TradeEntry } from "@/lib/types";

function entryPnl(entry: TradeEntry) {
  const totalOut = entry.exits.reduce((s, e) => s + Number(e.amount_out), 0);
  return totalOut - Number(entry.amount_in);
}

interface DashboardProps {
  displayName: string;
  trades: TradeEntry[];
}

export function Dashboard({ displayName, trades }: DashboardProps) {
  const stats = useMemo(() => {
    const totalPnl = trades.reduce((sum, e) => sum + entryPnl(e), 0);
    const totalIn = trades.reduce((sum, e) => sum + Number(e.amount_in), 0);
    const winningTrades = trades.filter((e) => entryPnl(e) > 0);
    const losingTrades = trades.filter((e) => entryPnl(e) < 0);
    const winRate =
      trades.length > 0
        ? ((winningTrades.length / trades.length) * 100).toFixed(1)
        : "0";
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((s, e) => s + entryPnl(e), 0) /
          winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((s, e) => s + entryPnl(e), 0) /
          losingTrades.length
        : 0;
    const totalPct = totalIn > 0 ? (totalPnl / totalIn) * 100 : 0;

    return {
      totalPnl,
      totalIn,
      totalPct,
      totalTrades: trades.length,
      winRate,
      avgWin,
      avgLoss,
    };
  }, [trades]);

  // Monthly PnL data for the bar chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of trades) {
      const d = new Date(entry.trade_date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + entryPnl(entry));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pnl]) => {
        const [y, m] = month.split("-");
        const label = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1]} ${y.slice(2)}`;
        return { month: label, pnl: Number(pnl.toFixed(2)) };
      });
  }, [trades]);

  // Cumulative PnL data for the line chart
  const cumulativeData = useMemo(() => {
    // Group by date first
    const dateMap = new Map<string, number>();
    for (const entry of trades) {
      dateMap.set(
        entry.trade_date,
        (dateMap.get(entry.trade_date) ?? 0) + entryPnl(entry)
      );
    }
    const sorted = Array.from(dateMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    let cumulative = 0;
    return sorted.map(([date, pnl]) => {
      cumulative += pnl;
      const d = new Date(date + "T00:00:00");
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return {
        date: label,
        cumulative: Number(cumulative.toFixed(2)),
      };
    });
  }, [trades]);

  // Daily PnL for a recent-history bar chart (last 60 trading days)
  const dailyData = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const entry of trades) {
      dateMap.set(
        entry.trade_date,
        (dateMap.get(entry.trade_date) ?? 0) + entryPnl(entry)
      );
    }
    const sorted = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-60);
    return sorted.map(([date, pnl]) => {
      const d = new Date(date + "T00:00:00");
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return { date: label, pnl: Number(pnl.toFixed(2)) };
    });
  }, [trades]);

  const monthlyChartConfig = {
    pnl: {
      label: "PnL",
      color: "var(--chart-1)",
    },
  };

  const cumulativeChartConfig = {
    cumulative: {
      label: "Cumulative PnL",
      color: "var(--chart-2)",
    },
  };

  const dailyChartConfig = {
    pnl: {
      label: "Daily PnL",
      color: "var(--chart-1)",
    },
  };

  const greeting = displayName
    ? `Hello ${displayName}`
    : "Hello";

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{greeting}</h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your trading performance.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar">Open Calendar</Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All-Time PnL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {stats.totalPnl >= 0 ? "+" : ""}
              {stats.totalPnl.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.totalPct >= 0 ? "+" : ""}
              {stats.totalPct.toFixed(1)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
            <p className="text-xs text-muted-foreground">
              across all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
            <p className="text-xs text-muted-foreground">
              of trades profitable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Win / Avg Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <span className="text-green-600">
                +{stats.avgWin.toFixed(2)}
              </span>
              {" / "}
              <span className="text-red-600">
                {stats.avgLoss.toFixed(2)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">per trade</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative PnL line chart */}
      {cumulativeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={cumulativeChartConfig}
              className="h-[300px] w-full"
            >
              <LineChart
                data={cumulativeData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly PnL bar chart — REMOVED */}

      {/* Daily PnL (last 60 trading days) */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Daily PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={dailyChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart
                data={dailyData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.pnl >= 0
                          ? "oklch(0.65 0.2 145)"
                          : "oklch(0.65 0.2 25)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {trades.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No trades recorded yet. Head to the calendar to start logging
              your trades.
            </p>
            <Button asChild>
              <Link href="/calendar">Go to Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
