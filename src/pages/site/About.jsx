import React from "react";
import { Target, Eye, HeartHandshake, ShieldCheck } from "lucide-react";
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
  <div data-testid="site-about-page">
    <Seo
      title="About"
      description="Tradgella is built by traders, for traders — to make keeping a disciplined trading journal effortless and turn your record into a measurable edge."
      path="/about"
    />
    {/* Header */}
    <section className="bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Built by traders, for{" "}
          <span className="text-gradient">traders</span>
        </h1>
        <p className="mx-auto mt-6 text-lg text-gray-600 dark:text-gray-400">
          We believe the difference between a gambler and a professional is a
          journal. Tradgella exists to make keeping one effortless — and
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
            Tradgella started from a simple frustration: spreadsheets are
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
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
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
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
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

    <CTASection />
  </div>
);

export default About;
