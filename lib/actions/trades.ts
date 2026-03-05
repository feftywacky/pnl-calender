"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TradeEntry } from "@/lib/types";

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return {
    displayName: data?.display_name ?? user.user_metadata?.display_name ?? "",
    email: user.email ?? "",
  };
}

export async function getAllTrades(): Promise<TradeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trade_entries")
    .select("*, exits:trade_exits(*)")
    .order("trade_date")
    .order("created_at");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    exits: row.exits ?? [],
  })) as TradeEntry[];
}

export async function getTradesForMonth(
  year: number,
  month: number
): Promise<TradeEntry[]> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("trade_entries")
    .select("*, exits:trade_exits(*)")
    .gte("trade_date", startDate)
    .lte("trade_date", endDate)
    .order("trade_date")
    .order("created_at");

  if (error) throw error;

  // Normalise: exits may come back as null for rows with no related exits
  return (data ?? []).map((row) => ({
    ...row,
    exits: row.exits ?? [],
  })) as TradeEntry[];
}

export async function addEntry(tradeDate: string, name: string, amountIn: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("trade_entries").insert({
    user_id: user.id,
    trade_date: tradeDate,
    name,
    amount_in: amountIn,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateEntry(id: string, name: string, amountIn: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("trade_entries")
    .update({ name, amount_in: amountIn })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("trade_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function addExit(entryId: string, amountOut: number) {
  const supabase = await createClient();

  // RLS policy on trade_exits verifies the entry belongs to the current user
  const { error } = await supabase.from("trade_exits").insert({
    entry_id: entryId,
    amount_out: amountOut,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateExit(id: string, amountOut: number) {
  const supabase = await createClient();

  // RLS policy on trade_exits verifies ownership via trade_entries join
  const { error } = await supabase
    .from("trade_exits")
    .update({ amount_out: amountOut })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteExit(id: string) {
  const supabase = await createClient();

  // RLS policy on trade_exits verifies ownership via trade_entries join
  const { error } = await supabase.from("trade_exits").delete().eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}

export async function saveDayTrades(
  tradeDate: string,
  entries: Array<{
    id: string | null;
    name: string;
    amount_in: number;
    exits: Array<{
      id: string | null;
      amount_out: number;
    }>;
  }>,
  deletedEntryIds: string[],
  deletedExitIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // 1. Delete removed entries (cascade handles their exits)
  for (const entryId of deletedEntryIds) {
    const { error } = await supabase
      .from("trade_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);
    if (error) throw error;
  }

  // 2. Delete removed exits (from surviving entries)
  for (const exitId of deletedExitIds) {
    const { error } = await supabase
      .from("trade_exits")
      .delete()
      .eq("id", exitId);
    if (error) throw error;
  }

  // 3. Upsert entries and their exits
  for (const entry of entries) {
    let entryId: string;

    if (entry.id) {
      // Update existing entry
      const { error } = await supabase
        .from("trade_entries")
        .update({ name: entry.name, amount_in: entry.amount_in })
        .eq("id", entry.id)
        .eq("user_id", user.id);
      if (error) throw error;
      entryId = entry.id;
    } else {
      // Insert new entry
      const { data, error } = await supabase
        .from("trade_entries")
        .insert({
          user_id: user.id,
          trade_date: tradeDate,
          name: entry.name,
          amount_in: entry.amount_in,
        })
        .select("id")
        .single();
      if (error) throw error;
      entryId = data.id;
    }

    // Handle exits for this entry
    for (const exit of entry.exits) {
      if (exit.id) {
        // Update existing exit
        const { error } = await supabase
          .from("trade_exits")
          .update({ amount_out: exit.amount_out })
          .eq("id", exit.id);
        if (error) throw error;
      } else {
        // Insert new exit
        const { error } = await supabase
          .from("trade_exits")
          .insert({
            entry_id: entryId,
            amount_out: exit.amount_out,
          });
        if (error) throw error;
      }
    }
  }

  revalidatePath("/");
}
