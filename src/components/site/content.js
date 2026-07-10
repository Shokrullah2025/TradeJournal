// Single source of truth for the public product website copy & data.
// Keeping it here lets Home, Features, Pricing, and Footer stay DRY and
// guarantees the same wording is reused across pages (CLAUDE.md §5).
import {
  BookOpen,
  BarChart3,
  Link2,
  Activity,
  Calculator,
  Moon,
  Calendar,
  Camera,
  Tags,
  FileSpreadsheet,
  LineChart,
  Target,
  Clock,
  PieChart,
  ShieldCheck,
  Bell,
  Smartphone,
  Zap,
  TrendingUp,
} from "lucide-react";
import { FEATURE_PAGES, SOLUTION_PAGES } from "./detailPages";

// ── Top feature highlights shown on the Home page ─────────────────────────
export const HIGHLIGHT_FEATURES = [
  {
    icon: BookOpen,
    title: "Effortless journaling",
    description:
      "Log every trade in seconds — manual entry or auto-sync — with screenshots, rich notes, and tags so no setup is ever forgotten.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    description:
      "Win rate, profit factor, expectancy, Sharpe, and drawdown calculated automatically and visualised on a live equity curve.",
  },
  {
    icon: Link2,
    title: "Broker auto-sync",
    comingSoon: true,
    description:
      "Coming soon: connect Tradovate and popular prop firms to import fills automatically. No more copy-pasting from statements.",
  },
  {
    icon: Activity,
    title: "Backtesting studio",
    description:
      "Replay historical price action bar-by-bar, draw your setups, and measure a strategy before risking a cent.",
  },
  {
    icon: Calculator,
    title: "Risk calculator",
    description:
      "Size every position to a fixed percentage of account risk. Know your stop, your R-multiple, and your exposure up front.",
  },
  {
    icon: Moon,
    title: "Built for focus",
    description:
      "A fast, responsive interface with a beautiful dark mode that works everywhere — desktop, tablet, and phone.",
  },
];

// ── Full feature catalogue (Features page), grouped by category ───────────
export const FEATURE_CATEGORIES = [
  {
    id: "journaling",
    eyebrow: "Journaling",
    title: "Capture every trade, exactly how it happened",
    subtitle:
      "A frictionless journal that adapts to how you trade — from a quick scribble to a fully documented setup.",
    features: [
      {
        icon: BookOpen,
        title: "Quick & advanced entry",
        description:
          "Log a trade in seconds with Quick mode, or use Advanced risk-reward entry to capture stops, targets, and R-multiples.",
      },
      {
        icon: Camera,
        title: "Trade screenshots",
        description:
          "Attach chart screenshots to any trade. Images are optimised on upload so your journal stays fast.",
      },
      {
        icon: Tags,
        title: "Tags & templates",
        description:
          "Label trades by setup, session, or mistake. Save reusable templates so recurring strategies log instantly.",
      },
      {
        icon: Calendar,
        title: "Calendar view",
        description:
          "See profit and loss laid out day-by-day on a colour-coded calendar to spot streaks and weak sessions.",
      },
      {
        icon: FileSpreadsheet,
        title: "CSV & Excel import / export",
        description:
          "Bring history in from a spreadsheet, or export your full journal anytime — your data is always yours.",
      },
      {
        icon: BookOpen,
        title: "Rich notes",
        description:
          "Document your thesis, emotions, and lessons with a rich-text editor attached to every position.",
      },
    ],
  },
  {
    id: "analytics",
    eyebrow: "Analytics",
    title: "Understand your edge at a glance",
    subtitle:
      "Every metric a serious trader tracks, computed automatically and updated the moment a trade closes.",
    features: [
      {
        icon: LineChart,
        title: "Equity curve",
        description:
          "Watch your account grow over time and instantly see the impact of drawdowns and winning runs.",
      },
      {
        icon: Target,
        title: "Win rate & profit factor",
        description:
          "Core performance stats front-and-centre, broken down by account, strategy, and instrument.",
      },
      {
        icon: BarChart3,
        title: "Risk-adjusted metrics",
        description:
          "Sharpe ratio, expectancy, and maximum drawdown reveal whether your returns are worth the risk.",
      },
      {
        icon: Clock,
        title: "Time analysis",
        description:
          "Discover which days, sessions, and hours are actually profitable for you — and which to avoid.",
      },
      {
        icon: PieChart,
        title: "Distribution insights",
        description:
          "Analyse R-multiple distribution, win/loss spread, and instrument performance to find your real edge.",
      },
      {
        icon: TrendingUp,
        title: "Strategy comparison",
        description:
          "Compare strategies side-by-side to double down on what works and retire what doesn't.",
      },
    ],
  },
  {
    id: "auto-sync",
    eyebrow: "Broker auto-sync",
    comingSoon: true,
    title: "Your fills, imported automatically",
    subtitle:
      "Coming soon: connect your broker or prop firm once and let trades flow into your journal in real time. CSV & Excel import is available today.",
    features: [
      {
        icon: Link2,
        title: "Tradovate integration",
        description:
          "Securely connect Tradovate to sync executions automatically — no manual entry required.",
      },
      {
        icon: ShieldCheck,
        title: "Prop firm support",
        description:
          "Works with popular futures prop firms including Apex, Topstep, and MyFundedFutures evaluation accounts.",
      },
      {
        icon: Zap,
        title: "Real-time sync",
        description:
          "New fills appear in your journal as they happen, with duplicate-safe imports that never double-count.",
      },
      {
        icon: Bell,
        title: "Connection status",
        description:
          "Always know your sync health with clear connection indicators and notifications when attention is needed.",
      },
    ],
  },
  {
    id: "backtesting",
    eyebrow: "Backtesting",
    title: "Prove a strategy before you trade it",
    subtitle:
      "A built-in replay studio so you can validate setups against real historical price action.",
    features: [
      {
        icon: Activity,
        title: "Historical replay",
        description:
          "Step through past market data bar-by-bar to practise execution without the risk.",
      },
      {
        icon: LineChart,
        title: "Drawing tools",
        description:
          "Mark up charts with trendlines, zones, and levels to plan and document your setups.",
      },
      {
        icon: Target,
        title: "Simulated entries & exits",
        description:
          "Place hypothetical entries, stops, and targets and watch how they would have played out.",
      },
      {
        icon: BarChart3,
        title: "Performance review",
        description:
          "Every backtest feeds the same analytics engine, so simulated results are measured like live trades.",
      },
    ],
  },
  {
    id: "platform",
    eyebrow: "Platform",
    title: "Fast, secure, and a joy to use",
    subtitle:
      "The details that make ZalorTrade something you'll actually open every day.",
    features: [
      {
        icon: Calculator,
        title: "Risk calculator",
        description:
          "Size positions to a fixed account-risk percentage and know your R-multiple before you click buy.",
      },
      {
        icon: Moon,
        title: "Light & dark mode",
        description:
          "A carefully crafted theme for any time of day that remembers your preference across devices.",
      },
      {
        icon: Smartphone,
        title: "Fully responsive",
        description:
          "Designed mobile-first — review your performance on the train and journal from anywhere.",
      },
      {
        icon: ShieldCheck,
        title: "Secure by design",
        description:
          "Built on Supabase Auth with row-level security, so your trading data is private and only ever yours.",
      },
    ],
  },
];

// ── How it works (Home page) ──────────────────────────────────────────────
export const STEPS = [
  {
    number: "01",
    title: "Log or import",
    description:
      "Log trades by hand in seconds or import existing history from a spreadsheet. Broker auto-sync is coming soon.",
  },
  {
    number: "02",
    title: "Document the setup",
    description:
      "Add screenshots, notes, and tags while the trade is fresh so every lesson is captured.",
  },
  {
    number: "03",
    title: "Analyse performance",
    description:
      "Let the analytics engine surface your win rate, profit factor, and the patterns behind your results.",
  },
  {
    number: "04",
    title: "Refine & improve",
    description:
      "Double down on your edge, cut the leaks, and watch your equity curve respond over time.",
  },
];

// ── Headline metrics strip (Home page) ────────────────────────────────────
export const STATS_BAND = [
  { value: "Win rate", label: "tracked automatically" },
  { value: "Profit factor", label: "per strategy" },
  { value: "Sharpe", label: "risk-adjusted returns" },
  { value: "Drawdown", label: "always in view" },
];

// ── Pricing tiers — mirrors src/pages/Billing.jsx plan definitions ────────
export const PRICING_TIERS = [
  {
    id: "basic",
    name: "Basic",
    description: "For individual traders getting started.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Up to 50 trades per month",
      "Basic analytics dashboard",
      "Export to CSV",
      "Email support",
      "Mobile app access",
    ],
    popular: false,
    cta: "Start free",
  },
  {
    id: "premium",
    name: "Premium",
    description: "For serious traders and small teams.",
    monthlyPrice: 18,
    yearlyPrice: 290,
    features: [
      "Unlimited trades",
      "Advanced analytics & insights",
      "Risk management tools",
      "Custom reports",
      "Priority email support",
      "API access",
      "Real-time broker sync (coming soon)",
    ],
    popular: true,
    cta: "Start free trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For trading firms and large organizations.",
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      "Everything in Premium",
      "Team management",
      "Advanced security features",
      "Custom integrations",
      "24/7 phone support",
      "Dedicated account manager",
      "White-label options",
    ],
    popular: false,
    cta: "Contact sales",
  },
];

// ── Frequently asked questions (Pricing page) ─────────────────────────────
export const FAQS = [
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Basic plan is free forever and includes up to 50 trades a month with the core analytics dashboard. A card is captured at sign-up to verify your account, but you're never charged on the free plan.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Absolutely. Plans are month-to-month and you can cancel or downgrade at any time from your billing settings. You keep access until the end of the period.",
  },
  {
    question: "Which brokers can I connect?",
    answer:
      "Broker auto-sync is coming soon, launching with Tradovate and popular futures prop firms such as Apex, Topstep, and MyFundedFutures. Today you can import any broker's history via CSV or Excel.",
  },
  {
    question: "Is my trading data secure?",
    answer:
      "Your data is protected with Supabase Auth and row-level security, meaning every record is scoped to your account and never visible to other users.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Yes — switch to annual billing to save roughly two months compared to paying monthly. The discount is applied automatically at checkout.",
  },
];

// ── Testimonials (Home page) — representative, generic examples ───────────
export const TESTIMONIALS = [
  {
    quote:
      "I finally see which setups actually make money. My win rate climbed once I started cutting the trades the analytics flagged as losers.",
    name: "Jordan M.",
    role: "Futures day trader",
  },
  {
    quote:
      "The CSV import alone saves me an hour a day. My whole history landed in the journal in minutes and the numbers just add up.",
    name: "Priya S.",
    role: "Prop firm trader",
  },
  {
    quote:
      "Backtesting in the same place I journal changed how I prepare. I validate a setup, then trade it with confidence.",
    name: "Alex T.",
    role: "Swing trader",
  },
];

// ── Footer link columns ───────────────────────────────────────────────────
// Three curated columns (landing design). Feature/solution detail pages keep
// a crawl path via the nav mega menu, "See all features", related-page cards,
// and the sitemap; legal pages live in FOOTER_LEGAL_LINKS on the bottom line.
export const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Pricing", to: "/pricing" },
      { label: "Broker Sync", to: "/features/broker-sync" },
      { label: "AI Trade Insights", to: "/features/ai-insights" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", to: "/blog" },
      { label: "FAQ", to: "/pricing#faq" },
      { label: "Help center", to: "/contact" },
      { label: "Risk Calculator", to: "/features/risk-calculator" },
      { label: "Backtesting", to: "/features/backtesting" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

// Compact legal row rendered under the footer columns — keeps every legal
// page one click (and one crawl hop) from any public page.
export const FOOTER_LEGAL_LINKS = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Disclaimer", to: "/disclaimer" },
  { label: "Cookies", to: "/cookies" },
  { label: "Refunds", to: "/refund" },
  { label: "Acceptable Use", to: "/aup" },
  { label: "DMCA", to: "/dmca" },
];

// ── Primary navigation (navbar) ───────────────────────────────────────────
// The navbar is menu-driven: "mega" renders the multi-column Features panel,
// "dropdown" a simple list, "link" a flat NavLink. Feature/solution items are
// derived from the detail-page content module so the menu can never point at
// a page that doesn't exist.
//
// The mega menu is deliberately curated, not exhaustive: the six flagship
// features in two categories. The remaining detail pages stay reachable via
// "See all features", the footer columns, and the sitemap — the menu shows
// what we believe matters most, without overwhelming a first-time visitor.
// Emoji tiles from the approved landing design — one per nav item, rendered
// in a soft accent-tinted rounded square by the navbar.
const NAV_EMOJI = {
  "trade-journal": "📓",
  "trade-calendar": "📅",
  "broker-sync": "🔗",
  "performance-dashboard": "📊",
  backtesting: "⏮️",
  "risk-calculator": "🧮",
  "day-traders": "⚡",
  "futures-traders": "📈",
  "forex-crypto-traders": "🌐",
  "prop-firm-traders": "🏛️",
};

const featureNavItem = (page) => ({
  label: page.navLabel,
  description: page.navDescription,
  icon: page.icon,
  emoji: NAV_EMOJI[page.slug],
  to: `/features/${page.slug}`,
  // Unreleased features carry a "Soon" pill in the nav menus.
  badge: page.comingSoon ? "Soon" : undefined,
});

const NAV_FEATURE_GROUPS = [
  {
    heading: "Journal & Tracking",
    slugs: ["trade-journal", "trade-calendar", "broker-sync"],
  },
  {
    heading: "Analyze & Improve",
    slugs: ["performance-dashboard", "backtesting", "risk-calculator"],
  },
];

export const NAV_MENUS = [
  {
    label: "Features",
    type: "mega",
    groups: NAV_FEATURE_GROUPS.map(({ heading, slugs }) => ({
      heading,
      items: slugs.map((slug) =>
        featureNavItem(FEATURE_PAGES.find((page) => page.slug === slug))
      ),
    })),
    highlight: {
      badge: "NEW",
      title: "AI Trade Insights",
      description:
        "Let AI review your journal and tell you exactly where you're leaking money.",
      to: "/features/ai-insights",
    },
    footerLink: { label: "See all features", to: "/features" },
  },
  {
    label: "Solutions",
    type: "dropdown",
    items: SOLUTION_PAGES.map((page) => ({
      label: page.navLabel,
      description: page.navDescription,
      emoji: NAV_EMOJI[page.slug],
      to: `/solutions/${page.slug}`,
    })),
  },
  { label: "Pricing", type: "link", to: "/pricing" },
  { label: "Blog", type: "link", to: "/blog" },
  {
    label: "Company",
    type: "dropdown",
    items: [
      {
        label: "About us",
        description: "Why we built ZalorTrade",
        emoji: "🌱",
        to: "/about",
      },
      {
        label: "Contact & support",
        description: "Questions, feedback, help",
        emoji: "📮",
        to: "/contact",
      },
      {
        label: "FAQ",
        description: "Common questions answered",
        emoji: "💬",
        to: "/pricing#faq",
      },
    ],
  },
];
