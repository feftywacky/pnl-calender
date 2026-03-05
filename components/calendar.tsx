"use client";

import { useState, useEffect, useCallback } from "react";
import { DayCell } from "@/components/day-cell";
import { TradeDialog } from "@/components/trade-dialog";
import { getTradesForMonth } from "@/lib/actions/trades";
import { Button } from "@/components/ui/button";
import type { TradeEntry } from "@/lib/types";

interface CalendarProps {
  initialTrades: TradeEntry[];
  initialYear: number;
  initialMonth: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function entryPnl(entry: TradeEntry) {
  const totalOut = entry.exits.reduce((s, e) => s + Number(e.amount_out), 0);
  return totalOut - Number(entry.amount_in);
}

export function Calendar({
  initialTrades,
  initialYear,
  initialMonth,
}: CalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState<TradeEntry[]>(initialTrades);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTrades = useCallback(async () => {
    const data = await getTradesForMonth(year, month);
    setEntries(data);
  }, [year, month]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else { setMonth(month - 1); }
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else { setMonth(month + 1); }
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setSelectedDate(null);
    fetchTrades();
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const numRows = Math.ceil((firstDayOfMonth + daysInMonth) / 7);

  // Group entries by date
  const entriesByDate = new Map<string, TradeEntry[]>();
  for (const entry of entries) {
    const existing = entriesByDate.get(entry.trade_date) ?? [];
    existing.push(entry);
    entriesByDate.set(entry.trade_date, existing);
  }

  const monthlyTotal = entries.reduce((sum, e) => sum + entryPnl(e), 0);
  const monthlyTotalIn = entries.reduce(
    (sum, e) => sum + Number(e.amount_in),
    0
  );
  const monthlyPct =
    monthlyTotalIn > 0
      ? ((monthlyTotal / monthlyTotalIn) * 100).toFixed(1)
      : null;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between shrink-0">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          &larr; Prev
        </Button>
        <div className="flex flex-col items-center gap-0.5">
          <h2 className="text-xl font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <span
            className={`text-sm font-semibold ${
              monthlyTotal >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {monthlyTotal >= 0 ? "+" : ""}
            {monthlyTotal.toFixed(2)}
            {monthlyPct !== null &&
              ` (${monthlyTotal >= 0 ? "+" : ""}${monthlyPct}%)`}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          Next &rarr;
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 min-h-0 grid grid-cols-7 gap-1"
        style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
      >
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="w-full h-full" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDate.get(dateStr) ?? [];
          const pnl =
            dayEntries.length > 0
              ? dayEntries.reduce((sum, e) => sum + entryPnl(e), 0)
              : null;
          const totalIn = dayEntries.reduce(
            (sum, e) => sum + Number(e.amount_in),
            0
          );

          return (
            <DayCell
              key={dateStr}
              day={day}
              pnl={pnl}
              totalIn={totalIn}
              tradeCount={dayEntries.length}
              onClick={() => handleDayClick(dateStr)}
            />
          );
        })}
      </div>

      <TradeDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        date={selectedDate}
        entriesForDay={selectedDate ? (entriesByDate.get(selectedDate) ?? []) : []}
      />
    </div>
  );
}
