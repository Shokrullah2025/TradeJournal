/**
 * Blog content module. Mirrors the detailPages.js pattern: every post is a
 * plain data object rendered by BlogPost.jsx, so articles ship inside the
 * bundle, get prerendered to static HTML at build time (scripts/prerender.mjs),
 * and appear in the generated sitemap automatically.
 *
 * To publish a new article: add an object here (newest first), set publishedAt/
 * updatedAt to real ISO dates, and rebuild — routes, sitemap, and prerendered
 * HTML all derive from this array.
 */

export const BLOG_POSTS = [
  {
    slug: "how-to-keep-a-trading-journal",
    title: "How to Keep a Trading Journal (That You'll Actually Use)",
    seo: {
      title: "How to Keep a Trading Journal in 2026",
      description:
        "A practical guide to keeping a trading journal: what to log for every trade, how to review it weekly, and how journaling turns losses into a measurable edge.",
    },
    publishedAt: "2026-07-08",
    updatedAt: "2026-07-08",
    readingTime: 7,
    tags: ["Journaling", "Process", "Beginners"],
    intro:
      "Almost every profitable trader keeps a journal, yet almost every losing trader has started one and abandoned it within two weeks. The difference is rarely discipline — it's design. A journal that demands twenty fields per trade dies of friction; a journal that captures three numbers and a sentence survives long enough to change how you trade. This guide covers what to record, when to record it, and how to review it so the data actually feeds back into your decisions.",
    sections: [
      {
        heading: "Why most trading journals fail",
        paragraphs: [
          "The typical journey looks like this: you read that journaling matters, build an elaborate spreadsheet with thirty columns, fill it in diligently for a week, fall one day behind, then abandon it entirely. The problem isn't motivation — it's that the journal was designed for an imaginary trader with unlimited time and no emotions. After a losing day, the last thing you want to do is spend forty minutes documenting your failures in a spreadsheet.",
          "A journal only works if the cost of maintaining it is lower than the willpower you have left on your worst trading day. That means the core loop has to take seconds, not minutes. Log the objective facts automatically or near-automatically, and reserve your limited energy for the one thing software can't do: writing down what you were thinking.",
          "The second failure mode is journaling without reviewing. A journal is not a diary — it's a dataset. If you never aggregate it, query it, or compare months against each other, you're collecting data with no analysis, which is effort without payoff. The review loop is where the edge comes from, and we'll cover it below.",
        ],
      },
      {
        heading: "The six things worth logging on every trade",
        paragraphs: [
          "First, the mechanical facts: instrument, direction, entry price, exit price, position size, and fees. These are non-negotiable because every statistic you'll ever compute — win rate, profit factor, expectancy, drawdown — is derived from them. The good news is that none of it needs to be typed by hand: broker auto-sync can import fills directly, and a CSV import covers everything else.",
          "Second, the setup name. Tag each trade with the pattern you were trading: breakout, pullback, reversal, news, whatever vocabulary matches your playbook. This single tag is the highest-leverage field in the whole journal, because it lets you later ask the only question that matters: which of my setups make money, and which ones quietly bleed it?",
          "Third, the context: time of day, session, and market conditions. Many traders discover from their own data that they are profitable in the first two hours and give it all back after lunch. You cannot see that pattern without timestamps.",
          "Fourth, a screenshot of the chart at entry. Your memory of a trade rewrites itself within hours — the chart as you actually saw it, with your levels marked, is the only honest record of what the decision looked like in real time.",
          "Fifth, the plan: where was your stop, where was your target, and what was the risk-to-reward ratio at entry? Comparing the planned trade against the executed trade exposes the gap between your strategy and your behavior — early exits, moved stops, doubled positions.",
          "Sixth, one sentence about your state of mind. Not a paragraph — a sentence. \"Chased after missing the first move.\" \"Followed plan, no stress.\" Over a hundred trades, these sentences cluster into patterns that are worth more than any indicator.",
        ],
      },
      {
        heading: "The weekly review: where the edge actually comes from",
        paragraphs: [
          "Set a fixed thirty-minute appointment with your data every week — same day, same time. The review has three passes. Pass one: the numbers. Win rate, profit factor, average winner versus average loser, and total fees for the week. You're not judging yourself; you're establishing the baseline you'll compare next week against.",
          "Pass two: the outliers. Open your biggest winner and biggest loser and reread the entry note and screenshot. The question for the winner is \"was this skill or luck?\" The question for the loser is \"was this a bad plan or bad execution?\" A loser that followed the plan is tuition; a loser that broke the plan is a leak, and leaks compound.",
          "Pass three: one decision. End every review by writing down a single, specific change for next week — \"no trades in the first five minutes,\" \"half size on reversal setups until they prove themselves.\" One change per week is sustainable and measurable; five changes at once is noise.",
          "This loop — log cheaply, review weekly, change one thing — is the entire secret. Traders who run it for six months stop arguing with their opinions and start negotiating with their data.",
        ],
      },
      {
        heading: "Paper journal, spreadsheet, or dedicated software?",
        paragraphs: [
          "A paper notebook is better than nothing and excellent for the psychology sentence, but it can't compute a profit factor, and manually transcribing fills is exactly the friction that kills journals. Use paper as a supplement if you enjoy it, never as the system of record.",
          "A spreadsheet is free and infinitely flexible, and for a trader making a handful of trades a month it can genuinely work. Its weaknesses appear at volume: no broker import, formulas that silently break, no screenshots, and every statistic hand-built. Most spreadsheet journals die the week their owner gets busy.",
          "Dedicated journaling software exists to remove the friction: fills sync from the broker automatically, statistics compute themselves, screenshots attach to trades, and the weekly review starts from dashboards instead of raw rows. ZalorTrade was built around exactly this loop — automatic import, tagging, and analytics that answer \"which setups pay me\" without a single formula. If the tool saves you ten minutes a day, it has paid for itself before lunch.",
        ],
      },
    ],
    faqs: [
      {
        question: "How long before a trading journal shows results?",
        answer:
          "You need a sample, not a feeling — roughly 30 to 50 trades before per-setup statistics mean anything. Most active traders see their first genuine insight (a time window or setup that loses reliably) within four to six weeks of consistent logging.",
      },
      {
        question: "Should I journal losing trades differently from winners?",
        answer:
          "Log the same fields for both, but spend your review time asymmetrically: losers that broke your plan deserve the most attention, because they're the only category you can eliminate immediately without touching your strategy.",
      },
      {
        question: "Do I need to journal if my broker shows my trade history?",
        answer:
          "Broker history records what happened, not why. It has no setup tags, no screenshots, no plan-versus-execution comparison, and no state-of-mind notes — which is exactly the data that separates a journal from a statement.",
      },
    ],
    related: ["win-rate-vs-profit-factor", "how-to-pass-a-prop-firm-evaluation"],
  },
  {
    slug: "win-rate-vs-profit-factor",
    title: "Win Rate vs Profit Factor: Which Metric Actually Matters?",
    seo: {
      title: "Win Rate vs Profit Factor Explained",
      description:
        "Win rate feels good but profit factor pays the bills. Learn what each metric measures and which numbers a profitable trading strategy needs.",
    },
    publishedAt: "2026-07-08",
    updatedAt: "2026-07-08",
    readingTime: 6,
    tags: ["Analytics", "Metrics", "Strategy"],
    intro:
      "Ask a struggling trader about their system and they'll quote their win rate. Ask a professional and they'll quote their profit factor. Both numbers describe the same trades, but they answer different questions — and optimizing the wrong one is one of the most common ways traders turn a working strategy into a losing one. Here's what each metric actually measures, how they trade off against each other, and the honest math on what a sustainable system needs.",
    sections: [
      {
        heading: "What win rate really tells you",
        paragraphs: [
          "Win rate is the percentage of your trades that close profitably. If you take 100 trades and 58 close green, your win rate is 58%. It's intuitive, it's emotionally satisfying, and it's the number every beginner optimizes first — usually by taking profits early (which converts future big winners into small ones) and widening stops (which converts small losers into disasters).",
          "That's the trap: win rate says nothing about the size of wins and losses. A trader who wins 90% of the time, making $10 per winner, and loses $200 on each of the remaining 10% is losing money with a win rate most people would brag about. The metric rewards exactly the behaviors — cutting winners, letting losers run — that destroy accounts.",
          "Win rate does matter for one thing: psychology and losing streaks. A 35% win rate system can be very profitable, but it will regularly produce six, seven, eight losses in a row. If you can't emotionally survive the streaks your win rate statistically guarantees, you won't execute the system long enough to collect its edge. Use win rate to size your risk per trade, not to judge your strategy.",
        ],
      },
      {
        heading: "What profit factor measures instead",
        paragraphs: [
          "Profit factor is gross profits divided by gross losses. Win $12,000 across all your winners and lose $8,000 across all your losers, and your profit factor is 1.5 — you made $1.50 for every $1.00 you lost. Anything above 1.0 is profitable; below 1.0 loses money regardless of how impressive the win rate looks.",
          "The power of profit factor is that it combines frequency and magnitude in a single number. It doesn't care whether you win often with small wins or rarely with huge ones — it only cares whether the dollars in exceed the dollars out. That makes it very hard to game with the early-profit-taking tricks that inflate win rate.",
          "As a rough calibration from real trading data: below 1.0 is a losing system; 1.0 to 1.3 is marginal and can be wiped out by fees and slippage; 1.3 to 1.75 is solid and tradeable; above 2.0 is excellent and worth protecting. Be suspicious of anything above 3.0 over a small sample — it usually means one lucky outlier is carrying the whole statistic, which is why sample size matters more than the number itself.",
        ],
      },
      {
        heading: "The trade-off: why you can't maximize both",
        paragraphs: [
          "Win rate and average win size pull against each other structurally. Take profits at one times risk and you'll win often, but your winners will never outrun your losers. Hold for three times risk and your winners get big, but many trades that were briefly green will stop out red, dragging your win rate down. Every exit strategy is a point on this curve; there is no exit strategy that maximizes both ends.",
          "The break-even math makes the relationship concrete. At a 1:1 reward-to-risk ratio you need better than a 50% win rate just to break even. At 2:1 you only need 33%. At 3:1 you need 25%. This is why the classic advice is to know your numbers: a 40% win rate is catastrophic at 1:1 and comfortably profitable at 2.5:1.",
          "Expectancy ties it together: (win rate × average win) minus (loss rate × average loss). That's your expected profit per trade, and together with trade frequency it is your actual paycheck. Profit factor and expectancy will always agree on whether a system makes money; win rate alone frequently lies about it.",
        ],
      },
      {
        heading: "How to actually use these numbers",
        paragraphs: [
          "Compute them per setup, not per account. An account-level profit factor of 1.4 might decompose into a breakout setup running at 2.1 and a reversal setup running at 0.7 — meaning one habit is funding the other's losses. Cutting or fixing the 0.7 setup improves your results more than any new indicator ever will. This is the single most valuable query a trading journal can answer.",
          "Track the trend, not the snapshot. A profit factor computed over your last rolling 50 trades tells you whether your edge is stable, improving, or decaying as market conditions change. A lifetime number blends last year's market with this one's and hides the decay until the damage is done.",
          "None of this is practical by hand, which is where a journal with built-in analytics earns its keep. ZalorTrade computes win rate, profit factor, expectancy, and drawdown automatically from your synced trades, and breaks each of them down by setup, instrument, and time of day — so the question \"which of my setups actually pays me\" has a live answer instead of a quarterly spreadsheet project.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is a good profit factor for a trading strategy?",
        answer:
          "Above 1.3 after fees is tradeable, 1.5 to 2.0 is solid, and above 2.0 is excellent. Treat numbers above 3.0 on small samples with suspicion — verify them over at least 50 to 100 trades before trusting them with real size.",
      },
      {
        question: "Can a strategy with a 40% win rate be profitable?",
        answer:
          "Easily — it just needs winners meaningfully larger than losers. At a 40% win rate, an average reward-to-risk of 2:1 produces a healthy positive expectancy. Many trend-following systems live in exactly this zone.",
      },
      {
        question: "Why is my win rate high but I'm still losing money?",
        answer:
          "Your average loss is bigger than your average win — the classic pattern of taking profits early and letting losers run. Check your profit factor: if it's below 1.0, the win rate is cosmetic. The fix is usually mechanical stop placement and letting winners reach their planned targets.",
      },
    ],
    related: ["how-to-keep-a-trading-journal", "how-to-pass-a-prop-firm-evaluation"],
  },
  {
    slug: "how-to-pass-a-prop-firm-evaluation",
    title: "How to Pass a Prop Firm Evaluation: A Data-Driven Approach",
    seo: {
      title: "How to Pass a Prop Firm Evaluation",
      description:
        "Most traders fail prop firm evaluations on rules, not skill. A data-driven playbook: daily loss math, position sizing, and the stats to track.",
    },
    publishedAt: "2026-07-08",
    updatedAt: "2026-07-08",
    readingTime: 8,
    tags: ["Prop Firms", "Risk Management", "Futures"],
    intro:
      "Industry estimates put prop firm evaluation pass rates somewhere between 5% and 20% — and the majority of failures have nothing to do with trading skill. Traders fail evaluations by breaking rules they forgot, sizing positions the daily loss limit can't survive, and forcing trades to meet self-imposed deadlines. Passing is a risk-management exam wearing a trading costume. Here's the data-driven playbook.",
    sections: [
      {
        heading: "Understand what the evaluation is actually testing",
        paragraphs: [
          "A funded challenge has a profit target, a daily loss limit, and a maximum drawdown — often a trailing drawdown, which moves up as your equity rises and is the rule that catches most traders off guard. Read your firm's exact definitions before your first trade: does the trailing drawdown track closed equity or intraday peaks? Do overnight or news-time positions violate the rules? Traders lose paid attempts to clauses they never read.",
          "Notice what the structure rewards: not brilliance, but survival. The firm is testing whether you can extract steady profits without ever having a catastrophic day, because that's the trader they can safely scale. Every decision in the evaluation should be filtered through one question — does this keep my worst day small?",
          "Reframe the profit target as a consistency problem. An 8% target with a 5% maximum drawdown doesn't ask for home runs; it asks for a positive expectancy repeated across enough trades that variance can't kill you before the edge shows up. That reframe alone eliminates the all-in trades that end most attempts in week one.",
        ],
      },
      {
        heading: "The math that passes evaluations",
        paragraphs: [
          "Start with the daily loss limit and work backwards. If the limit is $1,000, risking $500 per trade means two losers end your day — and two consecutive losers is a completely routine event for any strategy on earth. Risk $200 per trade and you can absorb four losses and still trade; risk $100 and the daily limit becomes nearly impossible to hit through normal variance. Small size isn't timid; it's the entire strategy.",
          "Now check your own numbers against the losing-streak math. A 45% win rate strategy has roughly even odds of hitting five consecutive losses within a 100-trade sample. If five losses at your chosen size would breach the daily limit or eat a third of your total drawdown allowance, you're not trading a system — you're flipping coins with the entry fee. Your risk per trade must make your statistically inevitable losing streak survivable.",
          "Trade a deadline-free pace even when the evaluation has time pressure. The firms' own data shows rushed traders fail; most modern evaluations have no minimum daily activity, and many have dropped time limits entirely. Two or three A-grade setups per day at conservative size passes more evaluations than fifteen forced trades ever will. If your setup doesn't appear, not trading is a profitable day.",
        ],
      },
      {
        heading: "Prepare with your own statistics, not hope",
        paragraphs: [
          "Before paying for an attempt, you need to know four numbers about your strategy from your own journal: win rate, profit factor, average risk-to-reward, and maximum historical losing streak. If you don't know them, you're not ready — not because you're a bad trader, but because you can't do the sizing math above without them. Thirty to fifty logged trades on a demo or small live account produces a usable baseline.",
          "Then rehearse the evaluation before buying it: same instrument, same hours, same daily loss limit, same drawdown, tracked honestly for two weeks. If you can't pass your own simulation, the paid attempt is a donation. If you can, you walk in knowing your plan survives contact with variance — which changes how you trade under pressure more than any psychology trick.",
          "During the attempt, review every evening against the rules, not just the P&L: how close did you come to the daily limit, did you size any trade above plan, did you take any trade outside your playbook? A trailing drawdown means yesterday's profits raise today's floor — your journal needs to track your distance from that floor daily, because the number that ends evaluations is rarely the one traders are watching.",
          "This is exactly the workflow ZalorTrade's prop-firm tooling was built for: auto-synced fills from Tradovate and prop platforms, daily loss and drawdown tracking against your firm's specific limits, and per-setup statistics that tell you which trades belong in an evaluation and which ones are variance you can't afford. Passing is a data problem — solve it with data.",
        ],
      },
      {
        heading: "The three ways traders actually fail — and the countermeasures",
        paragraphs: [
          "Failure one: the blow-up day. One oversized trade or one revenge sequence breaches the daily limit. Countermeasure: a hard personal stop at 60-70% of the firm's daily limit, enforced by closing the platform. The firm's limit is a cliff edge; yours should be a fence well before it.",
          "Failure two: the slow bleed into trailing drawdown. Dozens of mediocre forced trades, each individually harmless, walk equity down until the trailing floor catches it. Countermeasure: a maximum trade count per day and a playbook whitelist — if the setup isn't on the list, it doesn't get capital during an evaluation.",
          "Failure three: passing the evaluation and failing funded. The evaluation was traded with discipline and the funded account with celebration. Countermeasure: change nothing on funding day. Same size, same setups, same daily stop — the evaluation rules were the training wheels; keep riding like they're still on. The traders who last treat month one of funding as evaluation phase three.",
        ],
      },
    ],
    faqs: [
      {
        question: "What percentage of traders pass prop firm evaluations?",
        answer:
          "Public estimates and firm disclosures generally land between 5% and 20% for first attempts, and the majority of failures are rule breaches — daily loss limits and trailing drawdown — rather than strategy failures. Conservative sizing addresses the biggest single cause directly.",
      },
      {
        question: "How much should I risk per trade in a prop evaluation?",
        answer:
          "A widely used ceiling is 20-25% of the daily loss limit per trade, so four to five routine losses can't end your day. Many successful evaluation passes report risking 0.25-0.5% of nominal account size per trade — smaller than feels natural, which is the point.",
      },
      {
        question: "Should I use the same strategy in the evaluation as in my normal trading?",
        answer:
          "Yes — but usually at reduced size and with a tightened playbook limited to your statistically best setups. The evaluation is the wrong place to experiment: bring the setups whose win rate and profit factor you already know from your journal.",
      },
    ],
    related: ["how-to-keep-a-trading-journal", "win-rate-vs-profit-factor"],
  },
];

const POST_MAP = Object.fromEntries(BLOG_POSTS.map((post) => [post.slug, post]));

export function getBlogPost(slug) {
  return POST_MAP[slug] ?? null;
}
