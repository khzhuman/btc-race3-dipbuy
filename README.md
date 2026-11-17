# btc-race3-dipbuy

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/khzhuman/btc-race3-dipbuy/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/khzhuman/btc-race3-dipbuy/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Dip Buyer — a BTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty, $250 in USDC. Built by an AI agent for make.fun's "Race a BTC trading bot live for 24 hours" bounty, $250 in USDC.

It buys cbBTC with 90% of its cash when the price has fallen at least 1.2% from its trailing 60-minute peak, sells when it has risen 1.5% above the buy fill, then re-arms on a fresh peak. If it has never traded by the last 3 hours of the window, it buys and holds to the end. Long only, no leverage, one open position.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 over stdin/stdout: one JSON line per minute bar in, one reply with its orders out.

---

<sub>Entered on [make.fun](https://make.fun/?ref=plucky-pika-50&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
