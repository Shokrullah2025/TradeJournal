import React, { useState } from "react";
import Seo from "../../components/seo/Seo";
import SectionHeading from "../../components/site/SectionHeading";
import PricingToggle from "../../components/site/PricingToggle";
import PricingCard from "../../components/site/PricingCard";
import FAQAccordion from "../../components/site/FAQAccordion";
import { PRICING_TIERS, FAQS } from "../../components/site/content";

// FAQPage structured data, built from the same FAQS shown in the accordion
// below so the markup always matches the visible content (a Google
// requirement for FAQ rich results).
const PRICING_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

/**
 * Pricing page (route "/pricing"). Billing-cycle toggle, three tiers mirroring
 * the in-app Billing plans, and an FAQ. All CTAs route to /register.
 */
const Pricing = () => {
  const [cycle, setCycle] = useState("monthly");

  return (
    <div data-testid="site-pricing-page">
      <Seo
        title="Pricing"
        description="Simple, transparent pricing. Start free with up to 50 trades a month, then upgrade for advanced analytics, backtesting, and CSV import. Cancel anytime."
        path="/pricing"
        jsonLd={PRICING_JSON_LD}
      />
      {/* Header + toggle */}
      <section className="bg-gradient-to-b from-accent-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            Simple, transparent <span className="text-gradient">pricing</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Start free and upgrade when you're ready. No hidden fees, cancel
            anytime.
          </p>
          <div className="mt-8 flex justify-center">
            <PricingToggle cycle={cycle} onChange={setCycle} />
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} cycle={cycle} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          All plans include secure cloud storage, dark mode, and access on every
          device.
        </p>
      </section>

      {/* FAQ — id anchor lets the navbar's Resources menu deep-link here */}
      <section id="faq" className="bg-gray-50 dark:bg-gray-800/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered"
            subtitle="Everything you need to know before getting started."
          />
          <div className="mt-12">
            <FAQAccordion />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
