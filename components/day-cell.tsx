"use client";

interface DayCellProps {
  day: number;
  pnl: number | null;
  totalIn: number;
  tradeCount: number;
  onClick: () => void;
}

export function DayCell({ day, pnl, totalIn, tradeCount, onClick }: DayCellProps) {
  let bgClass = "bg-muted/30 hover:bg-muted/50";
  if (pnl !== null && pnl > 0)
    bgClass =
      "bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50";
  if (pnl !== null && pnl < 0)
    bgClass =
      "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50";

  const pctStr =
    pnl !== null && totalIn > 0
      ? `${pnl >= 0 ? "+" : ""}${((pnl / totalIn) * 100).toFixed(1)}%`
      : null;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-md border relative flex items-center justify-center transition-colors cursor-pointer overflow-hidden ${bgClass}`}
    >
      {/* Day number — top left */}
      <div className="absolute top-1.5 left-2 flex items-center gap-1">
        <span className="text-xs font-medium leading-none">{day}</span>
        {tradeCount > 1 && (
          <span className="text-[10px] text-muted-foreground leading-none">
            {tradeCount}x
          </span>
        )}
      </div>

      {/* PnL — centered */}
      {pnl !== null && (
        <div className="flex flex-col items-center gap-0.5">
          <div
            className={`text-xs font-semibold leading-none ${
              pnl >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)}
          </div>
          {pctStr && (
            <div
              className={`text-[10px] font-medium leading-none ${
                pnl >= 0
                  ? "text-green-600 dark:text-green-500"
                  : "text-red-600 dark:text-red-500"
              }`}
            >
              {pctStr}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
