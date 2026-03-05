export interface TradeExit {
  id: string;
  entry_id: string;
  amount_out: number;
  created_at: string;
}

export interface TradeEntry {
  id: string;
  user_id: string;
  trade_date: string;
  name: string;
  amount_in: number;
  created_at: string;
  exits: TradeExit[];
}
