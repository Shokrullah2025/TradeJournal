import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  BookOpen,
  Calendar,
  BarChart3,
  History,
  Calculator,
  Link2,
} from "lucide-react";
import Seo from "../../components/seo/Seo";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "../../utils/seo";
import CTASection from "../../components/site/CTASection";
import { PRICING_TIERS, TESTIMONIALS, STATS_BAND } from "../../components/site/content";
import useSubscriptionPlans from "../../hooks/useSubscriptionPlans";

/**
 * Public landing page (route "/") — implementation of the approved landing
 * design (Evergreen version): hero with a live-looking product mock,
 * broker strip, gradient metrics band, AI Insights banner, feature bento
 * grid, journaling deep-dive, testimonials, pricing, and final CTA.
 *
 * The section sub-components below are tightly coupled to this page and never
 * used independently, so they live in this file (CLAUDE.md §5).
 */
const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  },
];

// Representative example values shown in the product mock — decorative only.
const EQUITY_AREA =
  "M0,80 L34,74 L68,78 L102,58 L136,63 L170,44 L204,49 L238,30 L272,34 L320,14";

const GRADIENT = "bg-gradient-to-br from-accent-400 via-accent-500 to-accent-700";

// ── Hero product mock ───────────────────────────────────────────────────────

const HeroMock = () => (
  <div className="relative" aria-hidden="true">
    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-accent-500/25 to-transparent blur-md" />
    <div className="relative overflow-hidden rounded-2xl border border-accent-100 bg-white shadow-2xl shadow-accent-900/20 dark:border-gray-700 dark:bg-gray-900">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-accent-100 bg-accent-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 font-nums text-xs text-gray-400 dark:text-gray-500">
          zalortrade.com / dashboard
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Net P&amp;L · this month
            </p>
            <p className="mt-0.5 font-nums text-2xl font-semibold text-green-600 dark:text-green-400 sm:text-3xl">
              +$8,420.50
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Win rate</p>
            <p className="mt-0.5 font-nums text-xl font-semibold text-gray-900 dark:text-gray-100">
              63.4%
            </p>
          </div>
        </div>

        {/* Equity curve */}
        <div className="my-4 rounded-xl border border-accent-100 bg-accent-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <svg viewBox="0 0 320 96" className="h-24 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="home-hero-eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${EQUITY_AREA} L320,96 L0,96 Z`}
              fill="url(#home-hero-eq)"
              className="text-accent-500"
            />
            <path
              d={EQUITY_AREA}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-500"
            />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Profit factor", value: "2.41", tone: "" },
            { label: "Expectancy", value: "+$132", tone: "text-green-600 dark:text-green-400" },
            { label: "Avg R", value: "1.9R", tone: "" },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-accent-100 bg-accent-50/50 p-2.5 dark:border-gray-700 dark:bg-gray-800/60"
            >
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{tile.label}</p>
              <p
                className={`mt-0.5 font-nums text-base font-semibold ${
                  tile.tone || "text-gray-900 dark:text-gray-100"
                }`}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Floating cards */}
    <div className="absolute -left-4 top-20 hidden animate-fade-in rounded-xl border border-accent-100 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:block lg:-left-7">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Golden hour</p>
      <p className="text-base font-bold text-gray-900 dark:text-gray-100">9:30–10:15 AM</p>
      <p className="mt-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
        75% win · +$67 avg
      </p>
    </div>
    <div className="absolute -bottom-5 -right-2 hidden animate-fade-in items-center gap-3 rounded-xl border border-accent-100 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:flex lg:-right-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-100 text-accent-600 dark:bg-accent-900/50 dark:text-accent-300">
        <Sparkles className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[11px] text-gray-500 dark:text-gray-400">AI Insight</span>
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
          Cut 12–1 PM trades
        </span>
      </span>
    </div>
  </div>
);

// ── Bento mini-visuals ──────────────────────────────────────────────────────

const MiniTradeRows = () => (
  <div className="mt-4 space-y-2">
    {[
      { sym: "NQ", label: "Long · Breakout", pnl: "+$584" },
      { sym: "ES", label: "Short · Reversal", pnl: "+$212" },
    ].map((row) => (
      <div
        key={row.sym}
        className="flex items-center gap-2.5 rounded-lg border border-accent-100 bg-accent-50/50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60"
      >
        <span className="rounded bg-accent-100 px-1.5 py-0.5 font-nums text-[11px] font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
          {row.sym}
        </span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          {row.label}
        </span>
        <span className="ml-auto font-nums text-xs font-medium text-green-600 dark:text-green-400">
          {row.pnl}
        </span>
      </div>
    ))}
  </div>
);

// 0 = flat, 1 = small win, 2 = big win, -1 = loss
const HEAT_CELLS = [1, 0, -1, 1, 1, 0, 2, -1, 1, 2, 0, 1, 1, -1, 0, 2, 1, 1, -1, 0, 2];
const HEAT_CLASS = {
  2: "bg-accent-500",
  1: "bg-accent-200 dark:bg-accent-800",
  0: "bg-gray-200 dark:bg-gray-700",
  "-1": "bg-red-200 dark:bg-red-900/60",
};

const MiniHeatmap = () => (
  <div className="mt-4 grid grid-cols-7 gap-1.5">
    {HEAT_CELLS.map((value, index) => (
      <span
        key={index}
        className={`aspect-square rounded ${HEAT_CLASS[String(value)]}`}
      />
    ))}
  </div>
);

const BAR_HEIGHTS = ["40%", "62%", "48%", "78%", "55%", "90%", "70%", "84%"];

const MiniBars = () => (
  <div className="mt-4 flex h-[70px] items-end gap-1.5">
    {BAR_HEIGHTS.map((height, index) => (
      <span
        key={index}
        className={`flex-1 rounded-t ${GRADIENT}`}
        style={{ height }}
      />
    ))}
  </div>
);

// [up?, height%, align] — align: c center, fs top, fe bottom
const CANDLE_DATA = [
  [1, 55, "c"], [0, 42, "c"], [1, 60, "c"], [1, 48, "fe"], [0, 52, "c"],
  [1, 68, "c"], [0, 45, "c"], [1, 72, "fs"], [1, 58, "c"], [0, 50, "c"],
  [1, 64, "c"], [1, 80, "c"], [0, 46, "c"], [1, 70, "c"],
];
const ALIGN_CLASS = { c: "self-center", fs: "self-start", fe: "self-end" };

const MiniCandles = () => (
  <div className="mt-4 flex h-[70px] items-stretch gap-1 rounded-lg border border-accent-100 bg-accent-50/50 px-2.5 dark:border-gray-700 dark:bg-gray-800/60">
    {CANDLE_DATA.map(([up, height, align], index) => (
      <span
        key={index}
        className={`flex-1 rounded-sm ${ALIGN_CLASS[align]} ${
          up ? "bg-green-500" : "bg-red-500"
        }`}
        style={{ height: `${height}%` }}
      />
    ))}
  </div>
);

const MiniRiskBox = () => (
  <div className="mt-4 rounded-lg border border-accent-100 bg-accent-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
      <span>Risk 2%</span>
      <span>R:R</span>
    </div>
    <div className="mt-0.5 flex items-baseline justify-between">
      <span className="font-nums text-base font-semibold text-red-600 dark:text-red-400">
        -$1,000
      </span>
      <span className="font-nums text-base font-semibold text-green-600 dark:text-green-400">
        1:3.0
      </span>
    </div>
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <span className="block h-full w-[28%] bg-accent-500" />
    </div>
  </div>
);

const MiniSyncRows = () => (
  <div className="mt-4 space-y-2">
    {[
      { name: "Tradovate", when: "just now" },
      { name: "Apex", when: "2m ago" },
    ].map((broker) => (
      <div
        key={broker.name}
        className="flex items-center gap-2 rounded-lg border border-accent-100 bg-accent-50/50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60"
      >
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">{broker.name}</span>
        <span className="text-gray-500 dark:text-gray-400">connected</span>
        <span className="ml-auto font-nums text-gray-400 dark:text-gray-500">{broker.when}</span>
      </div>
    ))}
  </div>
);

const BENTO_CARDS = [
  {
    icon: BookOpen,
    title: "Trade Journal",
    description: "Log every trade with notes, screenshots & tags in seconds.",
    to: "/features/trade-journal",
    visual: MiniTradeRows,
  },
  {
    icon: Calendar,
    title: "P&L Calendar",
    description: "A daily heat-map that shows your rhythm at a glance.",
    to: "/features/trade-calendar",
    visual: MiniHeatmap,
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Win rate, profit factor, expectancy & Sharpe — auto-calculated.",
    to: "/features/performance-dashboard",
    visual: MiniBars,
  },
  {
    icon: History,
    title: "Backtest Replay",
    description: "Replay markets bar-by-bar and prove your edge before you risk a cent.",
    to: "/features/backtesting",
    visual: MiniCandles,
  },
  {
    icon: Calculator,
    title: "Risk Calculator",
    description: "Position sizing & R:R worked out before you enter.",
    to: "/features/risk-calculator",
    visual: MiniRiskBox,
  },
  {
    icon: Link2,
    title: "Broker Sync & Import",
    badge: "Coming soon",
    description: "Auto-sync from Tradovate & prop firms is coming soon — CSV & Excel import works today.",
    to: "/features/broker-sync",
    visual: MiniSyncRows,
  },
];

const BentoCard = ({ card }) => {
  const Icon = card.icon;
  const Visual = card.visual;
  return (
    <Link
      to={card.to}
      data-test-id={`home-bento-${card.to.split("/").pop()}-link`}
      className="group rounded-2xl border border-accent-100 bg-white p-5 transition-colors hover:border-accent-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-accent-500"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-900/50 dark:text-accent-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900 group-hover:text-accent-600 dark:text-gray-100 dark:group-hover:text-accent-300">
        {card.title}
        {card.badge && (
          <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
            {card.badge}
          </span>
        )}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {card.description}
      </p>
      <Visual />
    </Link>
  );
};

BentoCard.propTypes = {
  card: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    badge: PropTypes.string,
    description: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    visual: PropTypes.elementType.isRequired,
  }).isRequired,
};

// ── Deep dive: recent trades card ───────────────────────────────────────────

const RECENT_TRADES = [
  { sym: "NQ", name: "NQ · Long", setup: "Breakout · 9:41 AM", px: "2,290 → 2,318", pnl: "+$584", win: true },
  { sym: "ES", name: "ES · Short", setup: "Reversal · 10:02 AM", px: "4,215 → 4,201", pnl: "+$212", win: true },
  { sym: "NQ", name: "NQ · Long", setup: "Pullback · 11:20 AM", px: "2,290 → 2,276", pnl: "-$91", win: false },
  { sym: "MNQ", name: "MNQ · Long", setup: "Trend · 1:15 PM", px: "2,290 → 2,340", pnl: "+$100", win: true },
  { sym: "NVDA", name: "NVDA · Long", setup: "Breakout · open", px: "140 → live", pnl: "Open", win: null },
];

const JOURNAL_POINTS = [
  { title: "Quick & Advanced entry", detail: "Log a trade in seconds, or capture full stops, targets & risk." },
  { title: "Chart screenshots", detail: "Attach & auto-optimise images so your journal stays fast." },
  { title: "Tags & templates", detail: "Label by setup, session or mistake and reuse instantly." },
];

// ── Insight examples for the AI banner ──────────────────────────────────────

const AI_EXAMPLES = [
  {
    icon: AlertTriangle,
    text: "Your 12–1 PM trades win only 0% of the time across 25 trades. Consider sitting them out.",
  },
  {
    icon: CheckCircle2,
    text: "Breakouts on NQ before 10:15 AM carry a 2.4 profit factor — your real edge.",
  },
  {
    icon: TrendingDown,
    text: "Position size jumps 3× right after a loss. That's revenge risk.",
  },
];

// Broker auto-sync hasn't launched yet — the strip announces it as coming
// soon and names the launch partners. CSV & Excel import is live today.
const BROKERS = ["Tradovate", "Apex Trader Funding", "Topstep", "MyFundedFutures"];

// ── Page ────────────────────────────────────────────────────────────────────

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const Home = () => {
  // Live prices/names/features from the admin Pricing tab, overlaid on the
  // static tier content so the landing page always matches /pricing and the
  // in-app Billing cards. During prerender the effect doesn't run, so the
  // static defaults render; the client syncs to live amounts on hydration.
  const { plans: livePlans } = useSubscriptionPlans();
  const tiers = PRICING_TIERS.map((t) => ({
    ...t,
    name: livePlans[t.id]?.name ?? t.name,
    description: livePlans[t.id]?.description ?? t.description,
    features: livePlans[t.id]?.features?.length ? livePlans[t.id].features : t.features,
    monthlyPrice: livePlans[t.id]?.price ?? t.monthlyPrice,
  }));

  return (
  <div data-test-id="site-home-page">
    <Seo
      title="Trading Journal & Performance Analytics"
      path="/"
      jsonLd={HOME_JSON_LD}
    />

    {/* HERO */}
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-accent-200/60 blur-3xl dark:bg-accent-900/30"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-100 bg-white py-1.5 pl-4 pr-1.5 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:text-[13px]">
            Built for futures, forex &amp; crypto traders
            <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
              Free to start
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-[56px]">
            Every trade,
            <br />
            every edge,
            <br />
            <span className="text-accent-600 dark:text-accent-400">one clear journal.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Log trades in seconds, import your history in one upload, and let
            the analytics show you exactly what&apos;s working — and
            what&apos;s quietly costing you money.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              data-test-id="home-hero-getstarted-btn"
              className="btn btn-site inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold"
            >
              Start free trial
            </Link>
            <Link
              to="/features"
              data-test-id="home-hero-features-btn"
              className="btn inline-flex items-center gap-2 border border-accent-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-900 hover:bg-accent-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Explore the features
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              CSV &amp; Excel import in minutes
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              Bank-level encryption
            </span>
          </div>
        </div>

        <HeroMock />
      </div>
    </section>

    {/* BROKER STRIP */}
    <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8">
      <p className="flex items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
        Broker auto-sync
        <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
          Coming soon
        </span>
        launching with
      </p>
      <div
        data-test-id="home-broker-strip"
        className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-70"
      >
        {BROKERS.map((broker) => (
          <span
            key={broker}
            className="font-display text-lg font-semibold text-gray-700 dark:text-gray-300"
          >
            {broker}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        CSV &amp; Excel import is available today for any broker.
      </p>
    </section>

    {/* METRICS BAND */}
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        data-test-id="home-stats-band"
        className={`grid grid-cols-2 gap-6 rounded-3xl p-8 shadow-2xl shadow-accent-600/30 sm:p-9 lg:grid-cols-4 ${GRADIENT}`}
      >
        {STATS_BAND.map((stat) => (
          <div key={stat.value} className="text-center text-white">
            <p className="font-nums text-2xl font-semibold sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-[13px] opacity-85">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>

    {/* FEATURES */}
    <section className="mx-auto max-w-7xl px-4 pb-5 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto mb-11 max-w-2xl text-center">
        <p className="font-nums text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
          The full toolkit
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          Everything you need to
          <br className="hidden sm:block" /> trade with discipline
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
          One place to log, review, and sharpen your edge — from a quick
          scribble to a fully documented setup.
        </p>
      </div>

      {/* AI banner */}
      <div
        data-test-id="home-ai-banner"
        className={`mb-5 grid items-center gap-7 rounded-3xl p-8 text-white shadow-2xl shadow-accent-600/30 sm:p-9 lg:grid-cols-[1.2fr,0.9fr] ${GRADIENT}`}
      >
        <div>
          <span className="inline-block rounded-md bg-white/20 px-2.5 py-1 font-nums text-[11px] font-semibold tracking-[0.12em]">
            NEW · AI TRADE INSIGHTS
          </span>
          <h3 className="mt-4 text-2xl font-bold leading-tight sm:text-[28px]">
            Your journal, read back to you in plain English
          </h3>
          <p className="mt-2.5 max-w-md text-[15px] leading-relaxed opacity-90">
            ZalorTrade scans every trade and surfaces the patterns you can&apos;t
            see — losing time windows, revenge-trading streaks, and the setups
            quietly draining your account.
          </p>
          <Link
            to="/features/ai-insights"
            data-test-id="home-ai-insights-link"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-accent-700 transition-transform hover:-translate-y-px"
          >
            Generate my insights
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
          {AI_EXAMPLES.map((example) => {
            const Icon = example.icon;
            return (
              <div
                key={example.text.slice(0, 24)}
                className="mb-3 flex items-start gap-3 last:mb-0"
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-[13px] leading-relaxed">{example.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BENTO_CARDS.map((card) => (
          <BentoCard key={card.to} card={card} />
        ))}
      </div>
    </section>

    {/* DEEP DIVE — journaling */}
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
      <div>
        <p className="font-nums text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
          Journaling
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-[34px]">
          Capture every trade, exactly how it happened
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
          A frictionless journal that adapts to how you trade — from a one-tap
          Quick log to a fully documented setup with charts, tags, and reusable
          templates.
        </p>
        <div className="mt-6 space-y-4">
          {JOURNAL_POINTS.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-accent-100 text-accent-600 dark:bg-accent-900/50 dark:text-accent-300">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                  {point.title}
                </span>
                <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-400">
                  {point.detail}
                </span>
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/features/trade-journal"
          data-test-id="home-journal-link"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400"
        >
          More about the journal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-accent-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-accent-100 px-5 py-4 dark:border-gray-800">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            Recent Trades
          </span>
          <span className="font-nums text-xs text-gray-500 dark:text-gray-400">
            45 total · 63% win
          </span>
        </div>
        {RECENT_TRADES.map((trade) => (
          <div
            key={`${trade.sym}-${trade.setup}`}
            className="flex items-center gap-3 border-b border-accent-50 px-5 py-3 last:border-0 dark:border-gray-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-100 font-nums text-xs font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
              {trade.sym}
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                {trade.name}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {trade.setup}
              </span>
            </span>
            <span className="ml-auto hidden font-nums text-xs text-gray-500 dark:text-gray-400 sm:block">
              {trade.px}
            </span>
            <span
              className={`min-w-[64px] text-right font-nums text-sm font-semibold ${
                trade.win === null
                  ? "text-gray-400 dark:text-gray-500"
                  : trade.win
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {trade.pnl}
            </span>
          </div>
        ))}
      </div>
    </section>

    {/* TESTIMONIALS */}
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="font-nums text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
          Loved by disciplined traders
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          The habit that changed their P&amp;L
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((quote) => (
          <div
            key={quote.name}
            data-test-id={`home-testimonial-${initials(quote.name).toLowerCase()}`}
            className="flex flex-col rounded-2xl border border-accent-100 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="tracking-[2px] text-accent-500 dark:text-accent-400">
              ★★★★★
            </span>
            <p className="mt-3.5 flex-1 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
              &ldquo;{quote.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
                {initials(quote.name)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {quote.name}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {quote.role}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* PRICING */}
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="font-nums text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
          Pricing
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          Try it free for 7 days. Upgrade when it pays for itself.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            data-test-id={`home-pricing-${tier.id}-card`}
            className={`relative flex flex-col rounded-2xl border p-6 sm:min-h-[34rem] ${
              tier.popular
                ? "border-accent-500 bg-white shadow-xl dark:border-accent-500 dark:bg-gray-900"
                : "border-accent-100 bg-white dark:border-gray-700 dark:bg-gray-900"
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-600 px-3 py-1 font-nums text-[11px] font-semibold tracking-wide text-white">
                MOST POPULAR
              </span>
            )}
            <p
              className={`text-[15px] font-semibold ${
                tier.popular
                  ? "text-accent-600 dark:text-accent-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {tier.name}
            </p>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-nums text-4xl font-semibold text-gray-900 dark:text-gray-100">
                ${tier.monthlyPrice}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tier.monthlyPrice === 0 ? "/forever" : "/mo"}
              </span>
            </p>
            <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              {tier.description}
            </p>
            <div className="my-5 h-px bg-accent-100 dark:bg-gray-700" />
            {/* flex-1 absorbs the uneven feature counts so every CTA lands on the
                same baseline at the foot of the card, matching /pricing. */}
            <ul className="flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-[13px] text-gray-700 dark:text-gray-300"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-600 dark:text-accent-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              data-test-id={`home-pricing-${tier.id}-btn`}
              className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                tier.popular
                  ? "btn-site"
                  : "border border-accent-200 bg-accent-50 text-gray-900 hover:bg-accent-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link
          to="/pricing"
          data-test-id="home-pricing-full-link"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400"
        >
          See full pricing, annual billing &amp; FAQ
          <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </section>

    <CTASection />
  </div>
  );
};

export default Home;
