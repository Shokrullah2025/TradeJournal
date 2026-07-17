import React from "react";
import { Link } from "react-router-dom";
import { Target, Eye, HeartHandshake, ShieldCheck, Building2 } from "lucide-react";
import Seo from "../../components/seo/Seo";
import SectionHeading from "../../components/site/SectionHeading";
import CTASection from "../../components/site/CTASection";

const VALUES = [
  {
    icon: Target,
    title: "Process over outcome",
    description:
      "Good trading is a repeatable process. We build tools that reward discipline, not luck.",
  },
  {
    icon: Eye,
    title: "Radical clarity",
    description:
      "Your numbers should be honest and easy to read. No vanity metrics, no noise — just signal.",
  },
  {
    icon: HeartHandshake,
    title: "Trader-first",
    description:
      "Every feature starts with a real trading workflow. If it doesn't help you improve, it doesn't ship.",
  },
  {
    icon: ShieldCheck,
    title: "Your data, protected",
    description:
      "Your journal is private by design, secured with row-level isolation so it's only ever visible to you.",
  },
];

/**
 * About page (route "/about"): mission, who it's for, and the values behind
 * the product.
 */
const About = () => (
  <div data-test-id="site-about-page">
    <Seo
      title="About"
      description="ZalorTrade is built by traders, for traders — operated by ZalorTrade LLC (Colorado, USA) to turn your trading record into a measurable edge."
      path="/about"
    />
    {/* Header */}
    <section className="bg-gradient-to-b from-accent-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Built by traders, for{" "}
          <span className="text-gradient">traders</span>
        </h1>
        <p className="mx-auto mt-6 text-lg text-gray-600 dark:text-gray-400">
          We believe the difference between a gambler and a professional is a
          journal. ZalorTrade exists to make keeping one effortless — and
          to turn that record into a genuine, measurable edge.
        </p>
      </div>
    </section>

    {/* Mission */}
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Our mission"
            title="Help every trader find their edge"
            subtitle="Most traders fail not from a lack of effort, but a lack of feedback. We close that loop."
          />
          <p className="mt-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            ZalorTrade started from a simple frustration: spreadsheets are
            tedious, broker statements are messy, and the metrics that actually
            matter are buried. We set out to build the journal we wished we had —
            one that captures every trade automatically, calculates the stats
            that reveal a real edge, and lets you test new ideas before risking
            capital.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Whether you trade futures intraday, swing equities, or run a prop-firm
            evaluation, the goal is the same: replace guesswork with evidence.
          </p>
        </div>

        {/* Who it's for */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Who it's for
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            {[
              "Futures and forex day traders who need fast, accurate journaling.",
              "Prop-firm traders managing evaluation and funded accounts.",
              "Swing and position traders tracking longer-horizon setups.",
              "Anyone serious about turning trading into a repeatable process.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="bg-gray-50 dark:bg-gray-800/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <SectionHeading
          eyebrow="What we value"
          title="The principles behind the product"
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
                <value.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Company / legal entity */}
    <section
      data-test-id="about-company-section"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="The company"
            title="Independent and built to last"
            subtitle="ZalorTrade is a real, registered business — not a side project that disappears next year."
          />
          <p className="mt-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            ZalorTrade is owned and operated by{" "}
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              ZalorTrade LLC
            </strong>
            , a limited liability company registered in the State of Colorado,
            United States. We are independent and self-funded, which means our
            only customer is you — we don't sell your data, run ads, or answer
            to anyone whose interests conflict with yours.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Questions about the company, partnerships, or press? Reach out
            through our <Link to="/contact" className="font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400">contact page</Link>{" "}
            — a real person reads every message.
          </p>
        </div>

        <div
          data-test-id="about-company-card"
          className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
            <Building2 className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Company details
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Legal name", "ZalorTrade LLC"],
              ["Entity type", "Limited liability company"],
              ["Registered in", "Colorado, United States"],
              ["Product", "ZalorTrade — trading journal & analytics"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 sm:text-right">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500 dark:border-gray-700 dark:text-gray-400">
            ZalorTrade LLC is not a broker-dealer or registered investment
            adviser and does not provide financial advice. See our{" "}
            <Link to="/disclaimer" className="underline hover:text-accent-600 dark:hover:text-accent-400">
              full disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </section>

    <CTASection />
  </div>
);

export default About;
