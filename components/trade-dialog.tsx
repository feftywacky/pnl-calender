"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { saveDayTrades } from "@/lib/actions/trades";
import type { TradeEntry } from "@/lib/types";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

interface TradeDialogProps {
  open: boolean;
  onClose: () => void;
  date: string | null;
  entriesForDay: TradeEntry[];
}

interface LocalExit {
  id: string;
  amount_out: string;
}

interface LocalEntry {
  id: string;
  name: string;
  amount_in: string;
  exits: LocalExit[];
}

let tempCounter = 0;
function tempId() {
  return `temp-${++tempCounter}`;
}

function toLocalEntries(entries: TradeEntry[]): LocalEntry[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    amount_in: Number(e.amount_in).toString(),
    exits: e.exits.map((ex) => ({
      id: ex.id,
      amount_out: Number(ex.amount_out).toString(),
    })),
  }));
}

function localEntryPnl(entry: LocalEntry) {
  const totalOut = entry.exits.reduce(
    (s, e) => s + (parseFloat(e.amount_out) || 0),
    0
  );
  return totalOut - (parseFloat(entry.amount_in) || 0);
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TradeDialog({
  open,
  onClose,
  date,
  entriesForDay,
}: TradeDialogProps) {
  const [localEntries, setLocalEntries] = useState<LocalEntry[]>([]);
  const [deletedEntryIds, setDeletedEntryIds] = useState<string[]>([]);
  const [deletedExitIds, setDeletedExitIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New trade form state
  const [newName, setNewName] = useState("");
  const [newAmountIn, setNewAmountIn] = useState("");
  const [newExits, setNewExits] = useState<string[]>([""]);

  // Only initialize when dialog transitions from closed -> open
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setLocalEntries(toLocalEntries(entriesForDay));
      setDeletedEntryIds([]);
      setDeletedExitIds([]);
      setDirty(false);
      setSaving(false);
      setError(null);
      setExpandedId(null);
      setShowAddForm(false);
      setNewName("");
      setNewAmountIn("");
      setNewExits([""]);
    }
    prevOpen.current = open;
  }, [open, entriesForDay]);

  // -- Local mutation helpers --

  function updateEntryField(
    entryId: string,
    field: "name" | "amount_in",
    value: string
  ) {
    setLocalEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, [field]: value } : e))
    );
    setDirty(true);
  }

  function deleteLocalEntry(entryId: string) {
    setLocalEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (!entryId.startsWith("temp-")) {
      setDeletedEntryIds((prev) => [...prev, entryId]);
    }
    if (expandedId === entryId) setExpandedId(null);
    setDirty(true);
  }

  function updateExitAmount(entryId: string, exitId: string, value: string) {
    setLocalEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              exits: e.exits.map((ex) =>
                ex.id === exitId ? { ...ex, amount_out: value } : ex
              ),
            }
          : e
      )
    );
    setDirty(true);
  }

  function addLocalExit(entryId: string) {
    setLocalEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, exits: [...e.exits, { id: tempId(), amount_out: "" }] }
          : e
      )
    );
    setDirty(true);
  }

  function deleteLocalExit(entryId: string, exitId: string) {
    setLocalEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, exits: e.exits.filter((ex) => ex.id !== exitId) }
          : e
      )
    );
    if (!exitId.startsWith("temp-")) {
      setDeletedExitIds((prev) => [...prev, exitId]);
    }
    setDirty(true);
  }

  // -- New trade helpers --

  function addNewExit() {
    setNewExits((prev) => [...prev, ""]);
  }

  function updateNewExit(index: number, value: string) {
    setNewExits((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function removeNewExit(index: number) {
    setNewExits((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddLocalEntry() {
    const id = tempId();
    const entry: LocalEntry = {
      id,
      name: newName.trim(),
      amount_in: newAmountIn || "0",
      exits: newExits
        .filter((v) => v.trim() !== "")
        .map((v) => ({ id: tempId(), amount_out: v })),
    };
    setLocalEntries((prev) => [...prev, entry]);
    setNewName("");
    setNewAmountIn("");
    setNewExits([""]);
    setShowAddForm(false);
    setDirty(true);
  }

  function clearAllEntries() {
    for (const entry of localEntries) {
      if (!entry.id.startsWith("temp-")) {
        setDeletedEntryIds((prev) => [...prev, entry.id]);
      }
    }
    setLocalEntries([]);
    setExpandedId(null);
    setDirty(true);
  }

  // -- Save --

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      await saveDayTrades(
        date,
        localEntries.map((e) => ({
          id: e.id.startsWith("temp-") ? null : e.id,
          name: e.name,
          amount_in: parseFloat(e.amount_in) || 0,
          exits: e.exits.map((ex) => ({
            id: ex.id.startsWith("temp-") ? null : ex.id,
            amount_out: parseFloat(ex.amount_out) || 0,
          })),
        })),
        deletedEntryIds,
        deletedExitIds
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // -- Computed --

  const dayTotal = localEntries.reduce((sum, e) => sum + localEntryPnl(e), 0);
  const dayTotalIn = localEntries.reduce(
    (sum, e) => sum + (parseFloat(e.amount_in) || 0),
    0
  );
  const dayPct =
    dayTotalIn > 0 ? ((dayTotal / dayTotalIn) * 100).toFixed(1) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {date ? formatDate(date) : "Trades"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View and manage trades for this day
            </DialogDescription>
          </DialogHeader>

          {/* Day summary */}
          <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    dayTotal > 0 ? "text-green-600 dark:text-green-400" : dayTotal < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {dayTotal >= 0 ? "+" : ""}${dayTotal.toFixed(2)}
                </span>
                {dayPct !== null && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      dayTotal > 0
                        ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
                        : dayTotal < 0
                        ? "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {dayTotal >= 0 ? "+" : ""}{dayPct}%
                  </Badge>
                )}
              </div>
              {localEntries.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {localEntries.length} trade{localEntries.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={clearAllEntries}
                  disabled={saving}
                  className="text-xs text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Clear all
                </button>
              </div>
              )}
            </div>
        </div>

        <Separator />

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-2">
            {/* ── Trade cards ── */}
            {localEntries.map((entry) => {
              const pnl = localEntryPnl(entry);
              const totalOut = entry.exits.reduce(
                (s, e) => s + (parseFloat(e.amount_out) || 0),
                0
              );
              const isExpanded = expandedId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card transition-all"
                >
                  {/* Collapsed summary row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {entry.name || "Untitled"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ${parseFloat(entry.amount_in || "0").toFixed(2)} in
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          pnl > 0
                            ? "text-green-600 dark:text-green-400"
                            : pnl < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded edit area */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t flex flex-col gap-3">
                      {/* Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                        <Input
                          type="text"
                          value={entry.name}
                          placeholder="e.g. SPY 0DTE Calls"
                          className="h-8 text-sm"
                          disabled={saving}
                          onChange={(e) =>
                            updateEntryField(entry.id, "name", e.target.value)
                          }
                        />
                      </div>

                      {/* Amount in */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Amount In</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.amount_in}
                            className="h-8 text-sm pl-6"
                            disabled={saving}
                            onChange={(e) =>
                              updateEntryField(entry.id, "amount_in", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* Exits */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Amount Out</label>
                        <div className="flex flex-col gap-1.5">
                          {entry.exits.map((exit, exitIdx) => (
                            <div key={exit.id} className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                                {exitIdx + 1}.
                              </span>
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={exit.amount_out}
                                  className="h-7 text-sm pl-6"
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateExitAmount(
                                      entry.id,
                                      exit.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <button
                                onClick={() => deleteLocalExit(entry.id, exit.id)}
                                disabled={saving}
                                className="text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer shrink-0 p-0.5 transition-colors"
                                aria-label="Remove exit"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                          {entry.exits.length > 0 && (
                            <div className="text-xs text-muted-foreground pl-6.5">
                              Total out: ${totalOut.toFixed(2)}
                            </div>
                          )}
                          <button
                            onClick={() => addLocalExit(entry.id)}
                            disabled={saving}
                            className="text-xs text-muted-foreground hover:text-foreground mt-0.5 text-left disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <Plus className="size-3" />
                            Add exit
                          </button>
                        </div>
                      </div>

                      {/* PnL + Delete row */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span
                          className={`text-sm font-semibold ${
                            pnl > 0 ? "text-green-600 dark:text-green-400" : pnl < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                          }`}
                        >
                          PnL: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                        <button
                          onClick={() => deleteLocalEntry(entry.id)}
                          disabled={saving}
                          className="text-xs text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Add Trade ── */}
            {showAddForm ? (
              <div className="rounded-lg border border-dashed bg-card p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    New Trade
                  </span>
                  {localEntries.length > 0 && (
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. SPY 0DTE Calls"
                    className="h-8 text-sm"
                    disabled={saving}
                    autoFocus
                  />
                </div>

                {/* Amount In */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Amount In</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAmountIn}
                      onChange={(e) => setNewAmountIn(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm pl-6"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Amount Out */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Amount Out</label>
                  <div className="flex flex-col gap-1.5">
                    {newExits.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                          {idx + 1}.
                        </span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={val}
                            onChange={(e) => updateNewExit(idx, e.target.value)}
                            placeholder="0.00"
                            className="h-7 text-sm pl-6"
                            disabled={saving}
                          />
                        </div>
                        {newExits.length > 1 && (
                          <button
                            onClick={() => removeNewExit(idx)}
                            disabled={saving}
                            className="text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer shrink-0 p-0.5 transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addNewExit}
                      disabled={saving}
                      className="text-xs text-muted-foreground hover:text-foreground text-left disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Plus className="size-3" />
                      Add exit
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleAddLocalEntry}
                  disabled={saving || !newAmountIn}
                  className="w-full mt-1"
                  size="sm"
                >
                  <Plus className="size-4 mr-1" />
                  Add Trade
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                disabled={saving}
                className="w-full rounded-lg border border-dashed py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Plus className="size-4" />
                Add Trade
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 mt-3">{error}</p>
          )}
        </div>

        {/* ── Footer ── */}
        <Separator />
        <div className="flex justify-end gap-2 px-6 py-4 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onClose()} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
