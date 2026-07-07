// Single source of truth for the feature and solution detail pages
// (routes /features/:slug and /solutions/:slug) and for the navbar mega-menu
// items that point at them. Each entry is a complete, self-contained page:
// SEO metadata, hero copy, capability bullets, long-form educational sections
// (the content that earns search traffic), steps, FAQs, and related pages for
// internal linking. Keeping it data-driven means one template component
// renders every page and new pages ship by adding an object here.
import {
  BookOpen,
  Calendar,
  Link2,
  BarChart3,
  LineChart,
  Lightbulb,
  Activity,
  Calculator,
  Clock,
  Zap,
  CandlestickChart,
  Globe,
  ShieldCheck,
} from "lucide-react";

// ── Feature pages ──────────────────────────────────────────────────────────
export const FEATURE_PAGES = [
  {
    slug: "trade-journal",
    group: "Journal & Tracking",
    visual: "journal",
    icon: BookOpen,
    navLabel: "Trade Journal",
    navDescription: "Log every trade with notes & screenshots",
    seo: {
      title: "Trade Journal — Log Every Trade in Seconds",
      description:
        "A frictionless online trading journal: log entries in seconds, attach chart screenshots, tag setups and mistakes, and build the track record that makes you consistent.",
    },
    hero: {
      title: "A trading journal you'll actually keep",
      subtitle:
        "Most traders quit journaling because it's slow. ZalorTrade makes logging a trade faster than tweeting about it — so your journal stays complete and your lessons stay captured.",
    },
    bullets: [
      "Quick entry logs a trade in under 15 seconds",
      "Advanced entry captures stop, target, and planned R-multiple",
      "Attach chart screenshots to any trade",
      "Tag trades by setup, session, emotion, or mistake",
      "Rich-text notes for your thesis and review",
      "Reusable templates for recurring strategies",
    ],
    sections: [
      {
        heading: "Why journaling is the highest-ROI habit in trading",
        paragraphs: [
          "Every professional trading desk reviews its trades; most retail traders never do. The difference isn't intelligence — it's feedback. Without a written record, your memory rewrites history: winners feel skillful, losers feel unlucky, and the same mistake repeats for months without being noticed.",
          "A journal turns trading into a measurable process. When every entry, exit, and reason is recorded, patterns become undeniable: maybe your breakout setup only works in the morning session, or your losses cluster on days you skip preparation. You can only fix what you can see.",
        ],
      },
      {
        heading: "What a complete trade record looks like",
        paragraphs: [
          "A useful journal entry captures more than price and quantity. ZalorTrade records the full context: the instrument and direction, your planned stop and target, the setup tag, a chart screenshot taken at entry, and free-form notes on why you took the trade and how you felt.",
          "At review time, that context is what matters. Comparing your planned R-multiple to the realised one shows whether you're cutting winners early. Reading your own entry notes shows whether you followed your rules or chased. Screenshots let you replay the decision with fresh eyes.",
        ],
      },
      {
        heading: "Built for speed, so the habit sticks",
        paragraphs: [
          "The number-one reason journals die is friction. Quick mode asks for only the essentials and fills sensible defaults for the rest. Templates pre-fill your recurring setups. And if you connect your broker, fills arrive automatically and you only add the notes.",
          "Your data stays yours: export the full journal to CSV or Excel at any time, and import old history the same way — so switching to ZalorTrade doesn't mean starting from zero.",
        ],
      },
    ],
    steps: [
      { title: "Log the trade", description: "Quick entry or broker auto-sync — the trade lands in your journal with all core fields filled." },
      { title: "Add the context", description: "Screenshot, setup tag, and a two-line thesis while the trade is fresh in your mind." },
      { title: "Review weekly", description: "Filter by tag or session, read your own notes, and pick one leak to fix next week." },
    ],
    faqs: [
      {
        question: "What should I write in a trading journal?",
        answer:
          "At minimum: instrument, direction, entry, exit, position size, and the reason you took the trade. To get real value, add your planned stop and target, a setup tag, a chart screenshot, and one honest sentence about your state of mind. ZalorTrade structures all of this for you.",
      },
      {
        question: "How long does it take to log a trade?",
        answer:
          "Quick mode takes under 15 seconds. With broker auto-sync connected, executions import automatically and you only add notes and tags — many traders journal a full session in a couple of minutes.",
      },
      {
        question: "Can I import my existing trade history?",
        answer:
          "Yes. Import past trades from CSV or Excel, and export your full journal at any time. Your data is never locked in.",
      },
      {
        question: "Is a trading journal worth it for beginners?",
        answer:
          "It's most valuable for beginners. Journaling from trade one builds the review habit early and produces the data you'll need to know whether a strategy actually has an edge — before you size up.",
      },
    ],
    related: ["trade-calendar", "broker-sync", "ai-insights"],
  },
  {
    slug: "trade-calendar",
    group: "Journal & Tracking",
    visual: "calendar",
    icon: Calendar,
    navLabel: "Trade Calendar",
    navDescription: "Daily P&L heat-map at a glance",
    seo: {
      title: "Trade Calendar — Your P&L Day by Day",
      description:
        "See your trading profit and loss on a colour-coded calendar. Spot winning streaks, losing days, and overtrading patterns at a glance, then drill into any day's trades.",
    },
    hero: {
      title: "Your month, at a glance",
      subtitle:
        "The trade calendar lays your P&L over the days you traded — green for profit, red for loss — so streaks, tilt days, and overtrading jump off the screen.",
    },
    bullets: [
      "Colour-coded daily P&L heat-map",
      "Click any day to see every trade taken",
      "Weekly and monthly totals in view",
      "Spot overtrading by trade count per day",
      "Works with journaled and auto-synced trades",
      "Fully responsive — review from your phone",
    ],
    sections: [
      {
        heading: "Patterns you can only see on a calendar",
        paragraphs: [
          "Some of the most expensive habits in trading are invisible in a trade list but obvious on a calendar. Three red days in a row followed by an oversized green day is revenge trading. Consistent Monday losses might mean you're trading the open without a weekend plan. A profitable first week and a give-back second week suggests confidence cycles.",
          "Because each day is coloured by net P&L and shows the trade count, one glance answers questions that would take an hour in a spreadsheet: When do I lose? Do losing days cluster? Do I trade more when I'm losing?",
        ],
      },
      {
        heading: "From overview to detail in one click",
        paragraphs: [
          "The calendar is a navigation layer for your journal, not just a picture. Click any day to open a detail view with every trade taken: instrument, setup tag, R-multiple, and your notes. It's the natural flow for a weekend review — scan the month, open the days that stand out, and read what you were thinking.",
          "Daily totals roll up into weekly and monthly summaries, so you can judge a week without mentally summing numbers, and see whether the month's result came from process or from one outlier day.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is a trading P&L calendar?",
        answer:
          "It's a calendar view where each trading day is coloured by your net profit or loss for that day. It makes streaks, drawdown clusters, and overtrading visible in a way trade lists can't.",
      },
      {
        question: "Can I see individual trades from the calendar?",
        answer:
          "Yes — click any day to open the full list of trades taken that day, including tags, R-multiples, screenshots, and notes.",
      },
      {
        question: "Does the calendar work with broker auto-sync?",
        answer:
          "Yes. Synced fills and manually journaled trades both feed the calendar, so it always reflects your complete record.",
      },
    ],
    related: ["trade-journal", "performance-dashboard", "advanced-reports"],
  },
  {
    slug: "broker-sync",
    group: "Journal & Tracking",
    visual: "sync",
    icon: Link2,
    navLabel: "Broker Sync & CSV Import",
    navDescription: "Auto-import from Tradovate & more",
    seo: {
      title: "Broker Auto-Sync — Import Trades Automatically",
      description:
        "Connect Tradovate and popular futures prop firms to auto-import your fills into your trading journal in real time. Or bring history in via CSV and Excel import.",
    },
    hero: {
      title: "Your fills, imported automatically",
      subtitle:
        "Connect your broker once and every execution flows into your journal in real time — no statement exports, no copy-paste, no missed trades.",
    },
    bullets: [
      "Secure Tradovate connection via OAuth",
      "Works with Apex, Topstep, and MyFundedFutures evaluations",
      "Real-time sync as fills happen",
      "Duplicate-safe imports that never double-count",
      "CSV & Excel import for any other broker",
      "Clear connection-status indicators",
    ],
    sections: [
      {
        heading: "The journal that fills itself",
        paragraphs: [
          "Manual entry is where journaling habits go to die — especially for active futures traders taking ten or more trades a session. Auto-sync removes the chore entirely: entries, exits, quantities, and timestamps arrive from your broker as they happen, accurate to the fill.",
          "That accuracy matters for analytics. Slippage, partial fills, and scaling in and out are captured exactly as they executed, so your win rate and expectancy are computed from reality, not from what you remembered to type.",
        ],
      },
      {
        heading: "Built for prop-firm evaluation accounts",
        paragraphs: [
          "If you're trading an Apex, Topstep, or MyFundedFutures evaluation, your journal is your early-warning system. Synced trades let you watch your daily loss usage and consistency in one place, and keep a permanent record that survives account resets.",
          "Connections use OAuth — ZalorTrade never sees or stores your broker password — and every import is idempotent, so re-syncing never duplicates a trade.",
        ],
      },
      {
        heading: "No supported broker? CSV has you covered",
        paragraphs: [
          "Every broker can export a statement. ZalorTrade's CSV and Excel import maps your columns, validates every row, and skips duplicates, so you can backfill years of history in one upload and keep any broker's trades flowing with a weekly export.",
        ],
      },
    ],
    steps: [
      { title: "Connect", description: "Authorise ZalorTrade with your broker via OAuth — takes about a minute." },
      { title: "Trade as usual", description: "Fills sync in real time; each round-trip becomes a journal entry." },
      { title: "Add your context", description: "Tag the setup and drop a note — the numbers are already there." },
    ],
    faqs: [
      {
        question: "Which brokers does ZalorTrade sync with?",
        answer:
          "Tradovate direct, plus futures prop firms that run on it — including Apex, Topstep, and MyFundedFutures evaluation accounts. Any other broker works via CSV or Excel import.",
      },
      {
        question: "Is connecting my broker safe?",
        answer:
          "Yes. Connections use OAuth, so you authorise access on your broker's own site — ZalorTrade never sees your password. Access is read-only for trade data and can be revoked anytime.",
      },
      {
        question: "Will re-syncing create duplicate trades?",
        answer:
          "No. Imports are duplicate-safe: every fill is matched by its execution ID, so syncing again or overlapping a CSV import never double-counts.",
      },
      {
        question: "Can I import old trades from a spreadsheet?",
        answer:
          "Yes — upload a CSV or Excel export from any broker, map the columns once, and your history is backfilled with validation on every row.",
      },
    ],
    related: ["trade-journal", "performance-dashboard", "trade-calendar"],
  },
  {
    slug: "performance-dashboard",
    group: "Analytics",
    visual: "dashboard",
    icon: BarChart3,
    navLabel: "Performance Dashboard",
    navDescription: "Win rate, profit factor, expectancy",
    seo: {
      title: "Trading Performance Dashboard — Win Rate & Profit Factor",
      description:
        "Your win rate, profit factor, expectancy, Sharpe ratio, and equity curve — calculated automatically from your journal and updated the moment a trade closes.",
    },
    hero: {
      title: "Know your numbers, always",
      subtitle:
        "Every metric a serious trader tracks — win rate, profit factor, expectancy, drawdown, Sharpe — computed automatically from your journal and live on one dashboard.",
    },
    bullets: [
      "Live equity curve across all accounts",
      "Win rate and profit factor per strategy",
      "Expectancy and average R-multiple",
      "Maximum drawdown always in view",
      "Recent trades and daily P&L at a glance",
      "Charts adapt beautifully to mobile",
    ],
    sections: [
      {
        heading: "The four numbers that define your edge",
        paragraphs: [
          "Win rate alone is a vanity metric — a 90% win rate loses money if the occasional loss is ten times the average win. The numbers that matter together are win rate, profit factor (gross profit ÷ gross loss), expectancy (average result per trade in R), and maximum drawdown. ZalorTrade computes all four continuously.",
          "Expectancy is the one to watch: a positive expectancy of even 0.2R per trade compounds into a serious edge across hundreds of trades, while a negative one guarantees eventual loss no matter how good the last week felt.",
        ],
      },
      {
        heading: "Your equity curve tells the truth",
        paragraphs: [
          "The equity curve is the most honest chart in trading: it shows your account over time with every decision priced in. A rising curve with shallow drawdowns means a repeatable process. A jagged curve with deep valleys means position sizing or discipline problems — even if the end point is green.",
          "ZalorTrade draws it live from your journal, so after every session you see exactly what that day did to the shape of your curve.",
        ],
      },
      {
        heading: "Numbers you can act on, not just admire",
        paragraphs: [
          "Every stat filters by account, strategy, instrument, and date range. That turns 'my win rate is 54%' into 'my pullback setup wins 63% in the morning session but 38% in the afternoon' — which is a decision, not a statistic.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is a good profit factor in trading?",
        answer:
          "A profit factor above 1.0 means gross profits exceed gross losses. Sustained values around 1.5 are solid; above 2.0 is excellent. Below 1.0 the strategy loses money before costs — the dashboard makes that visible early.",
      },
      {
        question: "What is trading expectancy and why does it matter?",
        answer:
          "Expectancy is your average result per trade, usually expressed in R (risk units): (win rate × average win) − (loss rate × average loss). It's the single best summary of whether your process makes money over time.",
      },
      {
        question: "Do I have to calculate any of this myself?",
        answer:
          "No. Every metric is computed automatically from your journaled and synced trades, and updates the moment a trade closes.",
      },
    ],
    related: ["advanced-reports", "ai-insights", "trade-calendar"],
  },
  {
    slug: "advanced-reports",
    group: "Analytics",
    visual: "reports",
    icon: LineChart,
    navLabel: "Advanced Reports",
    navDescription: "By strategy, instrument & time of day",
    seo: {
      title: "Advanced Trading Reports — Strategy, Instrument & Time Analysis",
      description:
        "Break your trading performance down by strategy, instrument, day of week, and hour of day. Find where your real edge lives and cut the sessions that bleed money.",
    },
    hero: {
      title: "Find out where your edge actually lives",
      subtitle:
        "Aggregate stats hide the truth. Advanced reports slice your performance by strategy, instrument, session, and hour — so you can double down on what works and cut what doesn't.",
    },
    bullets: [
      "Strategy-by-strategy comparison tables",
      "Instrument performance breakdown",
      "Day-of-week and hour-of-day analysis",
      "R-multiple distribution charts",
      "Drawdown analysis over time",
      "Win/loss streak statistics",
    ],
    sections: [
      {
        heading: "Your P&L is an average of very different trades",
        paragraphs: [
          "A flat month rarely means every trade broke even. More often, one setup earned steadily while another gave it all back — netting to zero. Until performance is separated by strategy and instrument, the winner subsidises the loser and both stay invisible.",
          "ZalorTrade's strategy comparison puts each tagged setup side by side: trade count, win rate, profit factor, expectancy, and total P&L. The usual result is uncomfortable and valuable — most traders discover one or two setups carry the entire account.",
        ],
      },
      {
        heading: "Time analysis: when you trade matters",
        paragraphs: [
          "Markets have personalities by hour: the open trends, lunch chops, the close squeezes. Time analysis maps your results onto that clock, showing your P&L and win rate by hour of day and day of week.",
          "The classic discovery is a trader who is profitable before 11am and gives it back after lunch out of boredom. That single insight — stop trading the dead hours — is often worth more than a new strategy.",
        ],
      },
      {
        heading: "Distribution tells you about risk, not just return",
        paragraphs: [
          "The R-multiple distribution chart shows the shape of your outcomes: are wins clustered at +1R with a long tail of -3R disasters, or small controlled losses with occasional +4R runners? Two traders with identical total P&L can have wildly different distributions — and only one of them is safe to size up.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I know which of my trading strategies is best?",
        answer:
          "Tag each trade with its setup, and the strategy comparison report ranks them by expectancy, profit factor, and win rate over any date range. Judge by expectancy per trade, not total P&L — a strategy you rarely trade can still be your best one.",
      },
      {
        question: "What is time-of-day analysis in trading?",
        answer:
          "It's breaking your results down by the hour and weekday the trade was opened. It reveals which sessions genuinely make you money, and which ones you trade out of habit.",
      },
      {
        question: "How many trades do I need before reports are meaningful?",
        answer:
          "Treat conclusions from fewer than 30 trades per category as hints, not facts. The reports show the sample size for every slice so you know how much weight to give it.",
      },
    ],
    related: ["performance-dashboard", "ai-insights", "backtesting"],
  },
  {
    slug: "ai-insights",
    group: "Analytics",
    visual: "ai",
    icon: Lightbulb,
    navLabel: "AI Insights",
    navDescription: "Spot patterns in your winners & losers",
    seo: {
      title: "AI Trading Insights — Let AI Review Your Journal",
      description:
        "AI reviews your trading journal and tells you in plain language where you're leaking money: the setups, sessions, and habits behind your wins and losses.",
    },
    hero: {
      title: "An analyst that reads every trade you take",
      subtitle:
        "AI Insights reviews your journal — every entry, tag, and outcome — and reports back in plain language: what's working, what's leaking money, and what to do about it.",
    },
    bullets: [
      "Plain-language review of your recent performance",
      "Flags loss clusters and behaviour patterns",
      "Connects your notes and tags to outcomes",
      "Highlights your highest-expectancy conditions",
      "Suggests one concrete improvement at a time",
      "Runs on your own journal data — private to you",
    ],
    sections: [
      {
        heading: "The review you'd do if you had the time",
        paragraphs: [
          "A proper weekly review means re-reading dozens of trades, cross-referencing tags, and looking for patterns across weeks of data. Most traders skip it. AI Insights does that reading for you and surfaces what a diligent human reviewer would find: 'your losses cluster in the first 30 minutes after a red day' is the kind of sentence it produces.",
          "Because it reads your notes as well as your numbers, it connects behaviour to outcomes — hesitation mentioned in notes before your biggest winners, or 'FOMO' appearing in half your losing entries.",
        ],
      },
      {
        heading: "One improvement at a time, not a wall of stats",
        paragraphs: [
          "Insight without prioritisation is noise. Instead of twenty observations, AI Insights leads with the single change most likely to improve your expectancy, quantified from your own data. Fix it, and the next review moves to the next leak.",
          "Your journal data stays private: insights are generated for your account only and are never shared or used to train anything.",
        ],
      },
    ],
    faqs: [
      {
        question: "What does AI Insights actually analyse?",
        answer:
          "Your own journaled trades: outcomes, R-multiples, tags, timing, instruments, and the notes you write. It looks for statistically meaningful patterns and explains them in plain language.",
      },
      {
        question: "Is my trading data used to train AI models?",
        answer:
          "No. Insights are generated privately for your account. Your journal is protected by row-level security and is never shared or used for training.",
      },
      {
        question: "Does AI Insights give trade signals or financial advice?",
        answer:
          "No. It reviews your past performance to help you improve your own process. It doesn't predict markets, recommend positions, or provide financial advice.",
      },
    ],
    related: ["performance-dashboard", "advanced-reports", "trade-journal"],
  },
  {
    slug: "backtesting",
    group: "Tools",
    visual: "backtest",
    icon: Activity,
    navLabel: "Backtesting",
    navDescription: "Replay markets & test your edge",
    seo: {
      title: "Backtesting Studio — Replay Markets Bar by Bar",
      description:
        "Prove a trading strategy before risking money. Replay historical price action bar by bar, place simulated entries and exits, and measure results with the same analytics as live trades.",
    },
    hero: {
      title: "Prove it before you trade it",
      subtitle:
        "The backtesting studio replays real historical price action bar by bar. Practise your setup, place simulated trades, and get honest statistics — before a cent is at risk.",
    },
    bullets: [
      "Bar-by-bar historical replay",
      "Simulated entries, stops, and targets",
      "Full drawing tools — trendlines, zones, levels",
      "Sessions saved and resumable",
      "Results measured by the same analytics engine",
      "Compare backtest stats to live performance",
    ],
    sections: [
      {
        heading: "Why replay beats eyeballing old charts",
        paragraphs: [
          "Scrolling back on a chart to 'check' a strategy is self-deception: you can see the right edge, so every setup looks obvious. Bar-by-bar replay hides the future. You see exactly what you would have seen live, decide, commit, and then find out — the same psychological loop as real trading, without the account damage.",
          "Twenty replayed trades teach you more about a setup than two hundred imagined ones, because they include the hesitation, the fakeouts, and the losses that hindsight edits out.",
        ],
      },
      {
        heading: "Backtests measured like live trades",
        paragraphs: [
          "Simulated trades flow into the same analytics engine as your live journal: win rate, profit factor, expectancy, R-distribution. That gives you a like-for-like comparison — if your live expectancy runs far below your backtest, the strategy isn't broken; the execution is, and the journal will show you where.",
          "Sessions save automatically, so you can build a hundred-trade sample across evenings instead of one marathon.",
        ],
      },
    ],
    steps: [
      { title: "Pick market & date", description: "Choose an instrument and a historical period to replay." },
      { title: "Trade the replay", description: "Step through bars, mark up the chart, and place simulated entries, stops, and targets." },
      { title: "Read the stats", description: "Review expectancy, win rate, and R-distribution before deciding to trade it live." },
    ],
    faqs: [
      {
        question: "How many trades should a backtest include?",
        answer:
          "Aim for at least 30–50 trades of a single setup before trusting the statistics, and treat anything under 20 as anecdote. The studio tracks your sample size as you go.",
      },
      {
        question: "Can I backtest without knowing how to code?",
        answer:
          "Yes — this is manual (discretionary) backtesting. You replay the chart and trade it by hand, exactly as you would live. No programming involved.",
      },
      {
        question: "Are backtest results kept separate from my live journal?",
        answer:
          "Yes. Backtest sessions are tracked separately so simulated results never contaminate your live statistics — but both use the same metrics, so they're directly comparable.",
      },
    ],
    related: ["risk-calculator", "advanced-reports", "trade-journal"],
  },
  {
    slug: "risk-calculator",
    group: "Tools",
    visual: "calculator",
    icon: Calculator,
    navLabel: "Risk Calculator",
    navDescription: "Position sizing before you enter",
    seo: {
      title: "Position Size & Risk Calculator for Traders",
      description:
        "Size every position to a fixed percentage of account risk. Enter your stop, get your exact position size, R-multiple, and exposure before you click buy.",
    },
    hero: {
      title: "Size the position before you take it",
      subtitle:
        "The risk calculator turns 'how many contracts?' into arithmetic: set your account risk percentage, enter your stop, and get the exact size — every trade, same risk.",
    },
    bullets: [
      "Fixed-percentage account risk sizing",
      "Exact position size from entry and stop",
      "R-multiple and reward:risk shown up front",
      "Supports futures ticks, forex pips, and shares",
      "Fractional sizing for crypto and forex",
      "Saves your default risk settings",
    ],
    sections: [
      {
        heading: "Position sizing is the edge most traders skip",
        paragraphs: [
          "Two traders can take identical entries and end the year in opposite halves of the P&L distribution purely on sizing. Risking a fixed 1% per trade means a normal losing streak of five trades costs about 5% of the account — recoverable. Improvised sizing means one emotional oversize can erase a month.",
          "The maths of drawdown is brutal and worth knowing: lose 20% and you need +25% to get back; lose 50% and you need +100%. Fixed-fractional sizing exists to keep you off that curve.",
        ],
      },
      {
        heading: "From stop distance to exact size, instantly",
        paragraphs: [
          "The calculation is simple but tedious under pressure: account size × risk % ÷ stop distance, converted through tick or pip value for your instrument. The calculator does it instantly and shows the R-multiple of your target at the same time — so a sub-1R trade is exposed before you take it, not after.",
          "Your risk percentage and account details are saved, so pre-trade sizing becomes a two-field habit: entry, stop, done.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much should I risk per trade?",
        answer:
          "Most professional guidance lands between 0.5% and 2% of account per trade, with 1% as the common default. The right number is the one that keeps a five-loss streak psychologically and financially survivable.",
      },
      {
        question: "What is an R-multiple?",
        answer:
          "R is your initial risk on a trade (entry to stop). A trade that makes twice what it risked is +2R; a full stop-out is −1R. Measuring in R makes trades of different sizes and instruments comparable.",
      },
      {
        question: "Does the calculator work for futures, forex, and crypto?",
        answer:
          "Yes. It handles futures tick values, forex pip values, share quantities, and fractional sizes for crypto, so the risk maths is right for whatever you trade.",
      },
    ],
    related: ["backtesting", "performance-dashboard", "trade-journal"],
  },
  {
    slug: "pre-market-briefing",
    group: "Tools",
    visual: "briefing",
    icon: Clock,
    navLabel: "Pre-Market Briefing",
    navDescription: "Start each session prepared",
    seo: {
      title: "Pre-Market Briefing — Start Every Session Prepared",
      description:
        "A structured pre-market routine inside your trading journal: review yesterday's performance, note key levels and news, and set your plan before the bell.",
    },
    hero: {
      title: "Never trade the open unprepared again",
      subtitle:
        "The pre-market briefing builds preparation into your journal: yesterday's results, today's plan, and your rules — reviewed before the first trade, every day.",
    },
    bullets: [
      "Yesterday's P&L and mistakes front and centre",
      "Structured space for levels, news, and bias",
      "Daily plan linked to the day's actual trades",
      "Review plan vs. execution after the close",
      "Builds a searchable archive of your preparation",
    ],
    sections: [
      {
        heading: "Preparation is a measurable edge",
        paragraphs: [
          "Ask a trader about their worst days and a pattern emerges: they sat down late, skipped the plan, and took the first move they saw. A written pre-market routine is the cheapest edge available — it costs ten minutes and reliably filters out the impulsive first trade that starts half of all tilt spirals.",
          "Because the briefing lives in your journal, it's not a ritual that disappears — it's data. After a month you can compare your results on planned days versus unplanned ones. For most traders that comparison ends the debate about whether preparation matters.",
        ],
      },
      {
        heading: "A structure that takes ten minutes",
        paragraphs: [
          "The briefing prompts for what matters: yesterday's result and its one lesson, today's key levels and scheduled news, your directional bias, and the setups you're allowed to trade. At the close, you review execution against the plan — the fastest honest feedback loop in trading.",
        ],
      },
    ],
    faqs: [
      {
        question: "What should a pre-market routine include?",
        answer:
          "A quick review of yesterday (result and one lesson), today's key levels and news events, your bias, and an explicit list of setups you'll take. Ten focused minutes is enough.",
      },
      {
        question: "Does the briefing connect to my trades?",
        answer:
          "Yes — the day's plan sits alongside the day's actual trades in your journal, so your end-of-day review can compare what you planned with what you did.",
      },
    ],
    related: ["trade-journal", "trade-calendar", "ai-insights"],
  },
];

// ── Solution (audience) pages ──────────────────────────────────────────────
export const SOLUTION_PAGES = [
  {
    slug: "day-traders",
    group: "Solutions",
    visual: "calendar",
    icon: Zap,
    navLabel: "Day Traders",
    navDescription: "High-volume journaling & session review",
    seo: {
      title: "Trading Journal for Day Traders",
      description:
        "A trading journal built for day trading volume: auto-sync fills in real time, review sessions on a P&L calendar, and find which hours of the day actually pay you.",
    },
    hero: {
      title: "A journal that keeps up with day trading",
      subtitle:
        "Ten trades a session shouldn't mean thirty minutes of data entry. ZalorTrade syncs your fills in real time and turns high-volume days into clean, reviewable sessions.",
    },
    bullets: [
      "Real-time fill sync — no end-of-day typing",
      "Hour-of-day analysis finds your paying hours",
      "Session review on the P&L calendar",
      "Tag scalps, momentum, and reversal setups separately",
      "Overtrading visible as daily trade counts",
      "Fast mobile review between sessions",
    ],
    sections: [
      {
        heading: "Day trading generates data — use it",
        paragraphs: [
          "A day trader taking eight trades a day produces over 1,500 data points a year: enough to know, statistically, which setups, hours, and instruments pay. Most day traders throw that sample away by not recording it. With auto-sync, the record builds itself while you trade.",
          "The highest-value report for intraday traders is hour-of-day analysis. Nearly every day trader who runs it finds the same shape: a profitable window around the open, a flat-to-negative midday, and a mixed close. Trading only your window is often the single biggest improvement available.",
        ],
      },
      {
        heading: "Catch tilt while it's still cheap",
        paragraphs: [
          "Tilt announces itself in data before it destroys an account: trade counts creep up, average hold times shrink, and losses cluster after red mornings. The calendar and daily stats make those signatures visible in review, and the pre-market briefing gives you a circuit-breaker — a written plan that today's behaviour can be checked against.",
        ],
      },
    ],
    faqs: [
      {
        question: "I take 10+ trades a day. Is journaling realistic?",
        answer:
          "Yes — with auto-sync, your fills import in real time and the numbers are done. You add tags and a session note at the close. High-volume traders typically spend under five minutes a day journaling.",
      },
      {
        question: "Can ZalorTrade show my performance by time of day?",
        answer:
          "Yes. Time analysis breaks your win rate and P&L down by hour and weekday, which is usually the most profitable report a day trader can read.",
      },
    ],
    related: ["broker-sync", "advanced-reports", "pre-market-briefing"],
  },
  {
    slug: "futures-traders",
    group: "Solutions",
    visual: "sync",
    icon: CandlestickChart,
    navLabel: "Futures Traders",
    navDescription: "Tick values, contracts & Tradovate sync",
    seo: {
      title: "Futures Trading Journal — Tradovate Auto-Sync",
      description:
        "A futures trading journal with direct Tradovate sync, correct tick-value P&L for ES, NQ, CL and more, contract-based risk sizing, and analytics built for leveraged markets.",
    },
    hero: {
      title: "Built for the futures tape",
      subtitle:
        "Direct Tradovate sync, correct tick maths for every contract, and risk tools that think in contracts and ticks — a journal that speaks futures natively.",
    },
    bullets: [
      "Direct Tradovate auto-sync",
      "Correct tick-value P&L for ES, NQ, CL, GC and more",
      "Contract-based position size calculator",
      "Scaling in/out captured accurately",
      "Session analysis for Globex vs. RTH",
      "Backtest index futures bar by bar",
    ],
    sections: [
      {
        heading: "Futures P&L is tick maths — get it exact",
        paragraphs: [
          "An ES point is $50, an NQ point $20, a CL tick $10 — and a journal that treats futures like shares gets every statistic wrong. ZalorTrade computes P&L and R-multiples from real tick and point values per contract, so a two-lot NQ scalp and a one-lot CL swing are measured on the same honest scale.",
          "Leverage makes risk discipline non-negotiable: one extra contract on a volatile open can be a week's P&L. The risk calculator sizes in whole contracts from your stop distance in ticks, before you're in the trade.",
        ],
      },
      {
        heading: "Your Tradovate fills, already journaled",
        paragraphs: [
          "Connect Tradovate once and every execution — including partial fills and scale-outs — lands in your journal in real time. Fast futures trading produces messy fill sequences; duplicate-safe, execution-ID-matched imports keep the record exact.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does ZalorTrade calculate futures P&L correctly?",
        answer:
          "Yes — P&L and R-multiples use each contract's real tick and point values (ES, NQ, YM, CL, GC, and more), not share-style price differences.",
      },
      {
        question: "Does it handle scaling in and out of positions?",
        answer:
          "Yes. Auto-synced executions preserve partial fills and scale-outs, so multi-fill positions are reconstructed accurately.",
      },
    ],
    related: ["broker-sync", "risk-calculator", "backtesting"],
  },
  {
    slug: "forex-crypto-traders",
    group: "Solutions",
    visual: "journal",
    icon: Globe,
    navLabel: "Forex & Crypto",
    navDescription: "Fractional sizes, pips & 24/7 markets",
    seo: {
      title: "Forex & Crypto Trading Journal",
      description:
        "A trading journal for forex and crypto: pip-based risk maths, fractional position sizes, session analysis across 24-hour markets, and CSV import from any platform.",
    },
    hero: {
      title: "For markets that never close",
      subtitle:
        "Pip values, fractional sizes, and sessions that span midnight — ZalorTrade handles the details that make journaling forex and crypto painful in spreadsheets.",
    },
    bullets: [
      "Pip-based risk and P&L for forex pairs",
      "Fractional quantities for crypto positions",
      "Session analysis: London, New York, Asia",
      "CSV import from MT4/MT5 and exchanges",
      "Timezone-correct timestamps everywhere",
      "Weekend crypto trading fully supported",
    ],
    sections: [
      {
        heading: "24-hour markets punish unstructured trading",
        paragraphs: [
          "When the market never closes, 'I'll just take one more trade' has no natural end. The journal's session analysis shows which sessions actually pay you — London open, New York overlap, or the Asian range — and which ones only cost you sleep and spread.",
          "Every timestamp is stored timezone-aware and displayed in your local time, so a trade taken at 2am during a volatile Asia session lands on the right day in your calendar and the right bucket in your reports.",
        ],
      },
      {
        heading: "Fractional sizes and pip maths, handled",
        paragraphs: [
          "Crypto positions of 0.037 BTC and forex risk measured in pips break most journals and every spreadsheet eventually. ZalorTrade validates fractional quantities natively and computes forex risk from pip value and stop distance, so your R-multiples stay honest across every pair and coin you trade.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I import trades from MetaTrader or a crypto exchange?",
        answer:
          "Yes — export your history to CSV from MT4/MT5 or your exchange and import it in one upload. Column mapping and duplicate detection are handled for you.",
      },
      {
        question: "Does the journal handle fractional crypto sizes?",
        answer:
          "Yes. Quantities like 0.037 BTC are first-class values in the journal, the analytics, and the risk calculator.",
      },
    ],
    related: ["trade-journal", "risk-calculator", "advanced-reports"],
  },
  {
    slug: "prop-firm-traders",
    group: "Solutions",
    visual: "dashboard",
    icon: ShieldCheck,
    navLabel: "Prop Firm Traders",
    navDescription: "Track evaluations & stay within limits",
    seo: {
      title: "Prop Firm Trading Journal — Apex, Topstep & More",
      description:
        "Pass and keep funded accounts with a journal built for prop trading: auto-sync Apex, Topstep and MyFundedFutures accounts, watch drawdown usage, and prove your consistency.",
    },
    hero: {
      title: "Trade the evaluation like a professional",
      subtitle:
        "Prop firms don't pay for hot streaks — they pay for consistency inside rules. ZalorTrade tracks your evaluation the way the firm does, so nothing surprises you.",
    },
    bullets: [
      "Auto-sync Apex, Topstep & MyFundedFutures accounts",
      "Daily loss and drawdown usage in view",
      "Consistency metrics across evaluation days",
      "Per-account separation for multiple evals",
      "History survives account resets",
      "Rules checked against your written daily plan",
    ],
    sections: [
      {
        heading: "Evaluations are a discipline test, not a profit test",
        paragraphs: [
          "Most failed evaluations don't die from a bad strategy — they die from one rule breach: an oversized trade into news, a revenge session after a red morning, a daily loss limit clipped by two ticks. The journal's job in an evaluation is to keep the rules in your face while you trade.",
          "With your evaluation account synced, your daily P&L, trade count, and drawdown usage are always current. The pre-market briefing adds the professional habit firms actually reward: a written plan, checked against execution, every day.",
        ],
      },
      {
        heading: "Your track record outlives any single account",
        paragraphs: [
          "Evaluation accounts reset; your journal shouldn't. ZalorTrade keeps every account's history — failed evals included — as one continuous record. That data shows you why an attempt failed, and after funding, it's the documented consistency that justifies scaling up.",
          "Multiple evaluations run side by side stay cleanly separated, with per-account analytics and a combined view of your overall performance.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which prop firms does ZalorTrade work with?",
        answer:
          "Any firm running on Tradovate syncs automatically — including Apex, Topstep, and MyFundedFutures. Other firms work via CSV import of your trade history.",
      },
      {
        question: "Can I track multiple evaluation accounts at once?",
        answer:
          "Yes. Each account keeps separate analytics and history, and you can view any account individually or your performance as a whole.",
      },
      {
        question: "Does my history survive an account reset?",
        answer:
          "Yes — your journal is independent of the broker account, so every reset attempt stays in your permanent record for review.",
      },
    ],
    related: ["broker-sync", "pre-market-briefing", "performance-dashboard"],
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────
const bySlug = (pages) =>
  pages.reduce((map, page) => {
    map[page.slug] = page;
    return map;
  }, {});

const FEATURE_PAGE_MAP = bySlug(FEATURE_PAGES);
const SOLUTION_PAGE_MAP = bySlug(SOLUTION_PAGES);

export function getFeaturePage(slug) {
  return FEATURE_PAGE_MAP[slug] || null;
}

export function getSolutionPage(slug) {
  return SOLUTION_PAGE_MAP[slug] || null;
}

/**
 * Resolve a related-page slug to its route + nav copy, searching features
 * first, then solutions. Used for the "Explore more" internal-linking cards.
 */
export function getRelatedPage(slug) {
  const feature = FEATURE_PAGE_MAP[slug];
  if (feature) return { ...feature, to: `/features/${feature.slug}` };
  const solution = SOLUTION_PAGES.find((p) => p.slug === slug);
  if (solution) return { ...solution, to: `/solutions/${solution.slug}` };
  return null;
}
