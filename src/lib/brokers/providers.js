// Broker/prop-firm catalog for the Broker Hub connect flow.
//
// The hub shows PLATFORMS (ProjectX, Tradovate, …). Prop firms don't run their
// own trade APIs — each firm provisions accounts on one of these platforms, so
// the wizard first asks which platform, then which firm on it (see
// docs/broker-integrations.md §1). NO secrets here — descriptors only.
//
// ProjectX gateway hosts are per firm. Only firms marked `verified: true` have
// a host we've confirmed; the rest are prefilled from the documented
// `api.<firm>.projectx.com` pattern and the wizard shows the URL as editable so
// the trader can correct it from their firm's docs. `custom: true` entries make
// the user supply the host themselves.
//
// Class strings are written in full so Tailwind's JIT can detect them.

export const BROKER_PROVIDERS = [
  {
    key: "projectx",
    name: "ProjectX",
    subtitle: "Topstep, Alpha Futures & 19+ prop firms",
    initials: "PX",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    rating: 5,
    authType: "apiKey",
    requiresFlag: true,
    firms: [
      {
        id: "topstep",
        name: "Topstep",
        baseUrl: "https://api.topstepx.com",
        verified: true,
        popular: true,
        initials: "TS",
        badge: "bg-violet-500/10 text-violet-500 border-violet-500/30",
      },
      {
        id: "thefuturesdesk",
        name: "The Futures Desk",
        baseUrl: "https://api.thefuturesdesk.projectx.com",
        verified: true,
        initials: "FD",
        badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
      },
      {
        id: "alphafutures",
        name: "Alpha Futures",
        baseUrl: "https://api.alphafutures.projectx.com",
        popular: true,
        initials: "AF",
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      },
      {
        id: "blusky",
        name: "Blusky",
        baseUrl: "https://api.blusky.projectx.com",
        initials: "BS",
        badge: "bg-sky-500/10 text-sky-500 border-sky-500/30",
      },
      {
        id: "goatfundedfutures",
        name: "Goat Funded Futures",
        baseUrl: "https://api.goatfundedfutures.projectx.com",
        initials: "GF",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      },
      {
        id: "tickticktrader",
        name: "TickTick Trader",
        baseUrl: "https://api.tickticktrader.projectx.com",
        initials: "TT",
        badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      },
      {
        id: "fxifyfutures",
        name: "FXIFY Futures",
        baseUrl: "https://api.fxifyfutures.projectx.com",
        initials: "FX",
        badge: "bg-teal-500/10 text-teal-500 border-teal-500/30",
      },
      {
        id: "e8futures",
        name: "E8 Futures",
        baseUrl: "https://api.e8futures.projectx.com",
        initials: "E8",
        badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
      },
      {
        id: "toponefutures",
        name: "Top One Futures",
        baseUrl: "https://api.toponefutures.projectx.com",
        initials: "TO",
        badge: "bg-orange-500/10 text-orange-500 border-orange-500/30",
      },
      {
        id: "lucidtrading",
        name: "Lucid Trading",
        baseUrl: "https://api.lucidtrading.projectx.com",
        initials: "LT",
        badge: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/30",
      },
      {
        id: "other",
        name: "My firm isn't listed",
        baseUrl: "",
        custom: true,
        initials: "+",
        badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
      },
    ],
  },
  {
    key: "tradovate",
    name: "Tradovate",
    subtitle: "Apex, MyFundedFutures & personal accounts",
    initials: "T",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    rating: 4,
    authType: "oauth",
    requiresFlag: false,
    firms: [
      {
        id: "apex",
        name: "Apex Trader Funding",
        popular: true,
        initials: "A",
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      },
      {
        id: "mff",
        name: "MyFundedFutures",
        popular: true,
        initials: "MF",
        badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      },
      {
        id: "bulenox",
        name: "Bulenox",
        initials: "B",
        badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      },
      {
        id: "tpt",
        name: "Take Profit Trader",
        initials: "TP",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      },
      {
        id: "tradeify",
        name: "Tradeify",
        initials: "TF",
        badge: "bg-violet-500/10 text-violet-500 border-violet-500/30",
      },
      {
        id: "personal",
        name: "Personal Tradovate account",
        personal: true,
        initials: "T",
        badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      },
      {
        id: "other",
        name: "Other / not listed",
        custom: true,
        initials: "+",
        badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
      },
    ],
  },
];

export default BROKER_PROVIDERS;
