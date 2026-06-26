import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Link2, Zap, ShieldCheck } from "lucide-react";
import Hero from "../../components/site/Hero";
import StatsBand from "../../components/site/StatsBand";
import SectionHeading from "../../components/site/SectionHeading";
import FeatureGrid from "../../components/site/FeatureGrid";
import StepCard from "../../components/site/StepCard";
import Testimonials from "../../components/site/Testimonials";
import CTASection from "../../components/site/CTASection";
import { HIGHLIGHT_FEATURES, STEPS } from "../../components/site/content";

/**
 * Public landing page (route "/"). Sequences the hero, social proof, feature
 * highlights, how-it-works, an auto-sync spotlight, testimonials, and a final
 * call-to-action.
 */
const Home = () => (
  <div data-testid="site-home-page">
    <Hero />
    <StatsBand />

    {/* Feature highlights */}
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <SectionHeading
        eyebrow="Everything in one place"
        title="The complete trading journal"
        subtitle="From the first note to a fully analysed track record — Tradgella covers the entire loop."
      />
      <div className="mt-12">
        <FeatureGrid features={HIGHLIGHT_FEATURES} idPrefix="home-feature" />
      </div>
      <div className="mt-10 text-center">
        <Link
          to="/features"
          data-testid="home-explore-features-link"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Explore every feature
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>

    {/* How it works */}
    <section className="bg-gray-50 dark:bg-gray-800/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps to a sharper edge"
          subtitle="A simple loop that compounds: capture, document, analyse, improve."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              testId={`home-step-${index}`}
            />
          ))}
        </div>
      </div>
    </section>

    {/* Auto-sync spotlight */}
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Broker auto-sync"
            title="Stop copying trades from statements"
            subtitle="Connect Tradovate and popular prop firms once. New fills flow into your journal automatically, deduplicated and ready to analyse."
          />
          <ul className="mt-8 space-y-4">
            {[
              {
                icon: Link2,
                text: "Secure connection to Tradovate and prop-firm evaluation accounts.",
              },
              {
                icon: Zap,
                text: "Real-time imports that never double-count a fill.",
              },
              {
                icon: ShieldCheck,
                text: "Clear connection status so you always trust your data.",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/features"
            data-testid="home-autosync-link"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            See all integrations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Decorative broker-sync card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-3">
            {[
              { name: "Tradovate", status: "Connected", ok: true },
              { name: "Apex", status: "Connected", ok: true },
              { name: "Topstep", status: "Syncing…", ok: true },
              { name: "MyFundedFutures", status: "Available", ok: false },
            ].map((broker) => (
              <div
                key={broker.name}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {broker.name}
                </span>
                <span
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    broker.ok
                      ? "text-success-600 dark:text-success-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      broker.ok ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  {broker.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <Testimonials />
    <CTASection />
  </div>
);

export default Home;
