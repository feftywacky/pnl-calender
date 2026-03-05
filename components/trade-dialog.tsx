"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDayTrades } from "@/lib/actions/trades";
import type { TradeEntry } from "@/lib/types";

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

  // New trade form state
  const [newName, setNewName] = useState("");
  const [newAmountIn, setNewAmountIn] = useState("");
  const [newExits, setNewExits] = useState<string[]>([]);

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
      setNewName("");
      setNewAmountIn("");
      setNewExits([]);
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

  // -- New trade with exits --

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
    const entry: LocalEntry = {
      id: tempId(),
      name: newName.trim(),
      amount_in: newAmountIn || "0",
      exits: newExits
        .filter((v) => v.trim() !== "")
        .map((v) => ({ id: tempId(), amount_out: v })),
    };
    setLocalEntries((prev) => [...prev, entry]);
    setNewName("");
    setNewAmountIn("");
    setNewExits([]);
    setDirty(true);
  }

  function clearAllEntries() {
    for (const entry of localEntries) {
      if (!entry.id.startsWith("temp-")) {
        setDeletedEntryIds((prev) => [...prev, entry.id]);
      }
    }
    setLocalEntries([]);
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
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Trades — {date}</DialogTitle>
        </DialogHeader>

        {localEntries.length > 0 && (
          <div className="flex items-center justify-between shrink-0 -mt-1">
            <span
              className={`text-sm font-semibold ${
                dayTotal >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              Day total: {dayTotal >= 0 ? "+" : ""}
              {dayTotal.toFixed(2)}
              {dayPct !== null && ` (${dayTotal >= 0 ? "+" : ""}${dayPct}%)`}
            </span>
            <button
              onClick={clearAllEntries}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-3">
          {/* ── Existing / local entries ── */}
          {localEntries.map((entry) => {
            const pnl = localEntryPnl(entry);
            const totalOut = entry.exits.reduce(
              (s, e) => s + (parseFloat(e.amount_out) || 0),
              0
            );

            return (
              <div
                key={entry.id}
                className="rounded-lg border p-3 flex flex-col gap-3"
              >
                {/* Entry header with delete */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Trade
                  </span>
                  <button
                    onClick={() => deleteLocalEntry(entry.id)}
                    disabled={saving}
                    className="text-xs text-muted-foreground hover:text-red-500 disabled:opacity-40 cursor-pointer"
                    aria-label="Delete entry"
                  >
                    Delete trade
                  </button>
                </div>

                {/* Editable name */}
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Name</Label>
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

                {/* Editable amount in */}
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Amount In ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={entry.amount_in}
                    className="h-8 text-sm"
                    disabled={saving}
                    onChange={(e) =>
                      updateEntryField(entry.id, "amount_in", e.target.value)
                    }
                  />
                </div>

                {/* Exits / Amount Out list */}
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Amount Out</Label>
                  {entry.exits.length > 0 && (
                    <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-muted">
                      {entry.exits.map((exit, exitIdx) => (
                        <div key={exit.id} className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-6 shrink-0">
                            TP{exitIdx + 1}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={exit.amount_out}
                            className="h-7 text-sm flex-1"
                            disabled={saving}
                            onChange={(e) =>
                              updateExitAmount(
                                entry.id,
                                exit.id,
                                e.target.value
                              )
                            }
                          />
                          <button
                            onClick={() => deleteLocalExit(entry.id, exit.id)}
                            disabled={saving}
                            className="text-muted-foreground hover:text-red-500 text-xs disabled:opacity-40 cursor-pointer shrink-0"
                            aria-label="Delete exit"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground pt-0.5">
                        Total out: ${totalOut.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => addLocalExit(entry.id)}
                    disabled={saving}
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 text-left disabled:opacity-40 cursor-pointer"
                  >
                    + Add amount out
                  </button>
                </div>

                {/* Entry PnL */}
                <div
                  className={`text-xs font-semibold border-t pt-2 ${
                    pnl >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  PnL: {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </div>
              </div>
            );
          })}

          {/* ── Add new trade ── */}
          <div className="rounded-lg border border-dashed p-3 flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              New Trade
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="new-entry-name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="new-entry-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SPY 0DTE Calls"
                  disabled={saving}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="new-entry-amount" className="text-xs">
                  Amount In ($)
                </Label>
                <Input
                  id="new-entry-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmountIn}
                  onChange={(e) => setNewAmountIn(e.target.value)}
                  placeholder="0.00"
                  disabled={saving}
                />
              </div>

              {/* Amount Out section for new trade */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Amount Out ($)</Label>
                {newExits.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-6 shrink-0">
                      TP{idx + 1}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={val}
                      onChange={(e) => updateNewExit(idx, e.target.value)}
                      placeholder="0.00"
                      className="h-7 text-sm flex-1"
                      disabled={saving}
                    />
                    <button
                      onClick={() => removeNewExit(idx)}
                      disabled={saving}
                      className="text-muted-foreground hover:text-red-500 text-xs disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={addNewExit}
                  disabled={saving}
                  className="text-xs text-muted-foreground hover:text-foreground text-left disabled:opacity-40 cursor-pointer"
                >
                  + Add amount out
                </button>
              </div>

              <Button
                onClick={handleAddLocalEntry}
                disabled={saving || !newAmountIn}
                className="shrink-0 mt-1"
                variant="outline"
              >
                Add Trade
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* ── Save / Cancel ── */}
        <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={() => onClose()} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
