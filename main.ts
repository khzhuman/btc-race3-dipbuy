// Dip Buyer — a dip-buying cbBTC bot for btc-race-24h-20261117-0603.
//
// Idea in one sentence: buy cbBTC hard (90% of cash) when it has fallen at
// least 1.2% from its trailing 60-minute peak, sell when it has risen 1.5%
// above the buy fill, then re-arm on a fresh peak; if it never trades by the
// last 3 hours of the window, buy and hold to the end.
//
// How it talks to the harness: the hello message opens the session (universe,
// capital, caps, fees), then one batch arrives per minute bar and the bot
// answers each batch with exactly one reply carrying its orders (at most one
// order here). An order decided on a batch fills at the next bar's open, so
// the buy price is the next open, never the close that triggered it. The
// entry price used for the take-profit is the real fill price read back from
// the fills of the following batch, never an estimate. Long only, no
// leverage, no shorts, one open position, cash never below zero.
//
// Why this shape: the previous race (20261115) proved a selective bot that
// never trades finishes at exactly $0 and loses outright, while the winners
// were simple dip-buys with one or two trades. A full-size round trip costs
// about 26 bps in fees, slippage and impact, so the 1.2% dip plus 1.5%
// take-profit leaves a wide margin over costs, and the late fallback makes
// sure the bot almost always trades at least once.
//
// Deterministic: no clock, no environment, no randomness — every decision is
// a pure function of the bars seen so far, so two runs agree byte for byte.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
// Rolling peak window, in 1-minute bars.
const PEAK_BARS = 60;
// Buy when the latest close sits at least this far below the rolling peak.
const DIP_BPS = 120; // 1.2%
// Sell when the latest close sits at least this far above the buy fill.
const TAKE_PROFIT_BPS = 150; // 1.5%
// Spend 90% of cash on each buy.
const BUY_NUM = 9;
const BUY_DEN = 10;
// Last 3 hours of a 1440-bar window: buy and hold if nothing traded yet.
const FALLBACK_BAR = 1260;
// Max slippage vs the latest close; a 1-minute BTC move is far smaller.
const MAX_SLIPPAGE_BPS = 300;

let closes: bigint[] = [];
let entryPrice = 0n; // actual fill price of the open position; 0 while flat
let everTraded = false;
let barsSeen = 0;

await runBars({
  onBatch(state, batch) {
    if (state.warmingUp) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    barsSeen += 1;

    // Learn the true entry price from the fills of the previous batch.
    // A rejected buy leaves no fill, so the bot simply tries again.
    for (const fill of batch.fills) {
      if (fill.symbol !== SYMBOL || fill.status !== 'filled') continue;
      if (fill.side === 'buy') {
        entryPrice = BigInt(fill.price);
        everTraded = true;
        closes = [close];
      } else {
        entryPrice = 0n;
        closes = [close];
      }
    }

    const position = state.positions.get(SYMBOL);
    const qty = position?.qty ?? 0n;

    // Safety net: if a buy filled but its fill line never arrived, derive
    // the entry price from the position's cost (fees included, so this is a
    // touch above the true fill and the take-profit only triggers later).
    if (qty > 0n && entryPrice === 0n && position !== undefined && position.cost > 0n) {
      entryPrice = (position.cost * 10000000n) / qty;
      everTraded = true;
    }

    // Flat: hunt for a dip from the rolling peak, or the late fallback.
    if (qty === 0n) {
      closes.push(close);
      if (closes.length > PEAK_BARS) closes.shift();
      const peak = closes.reduce((a, b) => (a > b ? a : b), 0n);
      const dipBps = peak > 0n ? ((peak - close) * 10000n) / peak : 0n;
      const dipReady = closes.length >= PEAK_BARS && dipBps >= BigInt(DIP_BPS);
      const fallbackReady = !everTraded && barsSeen >= FALLBACK_BAR;
      if (dipReady || fallbackReady) {
        const notional = (state.cash * BigInt(BUY_NUM)) / BigInt(BUY_DEN);
        if (notional <= 0n) return [];
        const order: BuyInput = {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: notional,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [order];
      }
      return [];
    }

    // Holding: sell the whole position once the close clears take-profit.
    if (entryPrice > 0n && close * 10000n >= entryPrice * BigInt(10000 + TAKE_PROFIT_BPS)) {
      const order: SellInput = {
        side: 'sell',
        symbol: SYMBOL,
        qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      };
      return [order];
    }
    return [];
  },
});
