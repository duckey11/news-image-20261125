# news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/duckey11/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/duckey11/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

A one-page newspaper front page summing up the world's news of Wednesday, 25 November 2026. The program draws the whole page from scratch (its own 5x7 bitmap font, vector illustrations, hand-rolled PNG encoder, Node standard library only) and writes it to `/output/entry.png`. No network, fully deterministic.

Stories covered:

- Lead: Ukraine hits Russian ships in two seas, Zelenskiy confirms drone strikes in the Gulf of Finland and off Benghazi, Libya (Reuters, RFE/RL)
- CIA hit by cyberattack on classified systems (CNN)
- Huawei found guilty on 10 of 12 counts in a New York trial (US DOJ)
- COP31 climate summit collapses in Antalya with no final deal (BD Global Times)
- Houthis hit Riyadh's tallest tower, 11 wounded (Reuters)
- WHO evacuates Ebola staff in DR Congo amid fighting (WHO)
- Plus: 700,000+ Russian soldiers killed, per a new analysis (RFE/RL), and a ticker with NATO aircraft for Poland, England's T20I win, and the Sarkozy case going to trial.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=4thwrkqf&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards</sub>
