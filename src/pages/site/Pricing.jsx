import React, { useState } from "react";
import Seo from "../../components/seo/Seo";
import SectionHeading from "../../components/site/SectionHeading";
import PricingToggle from "../../components/site/PricingToggle";
import PricingCard from "../../components/site/PricingCard";
import FAQAccordion from "../../components/site/FAQAccordion";
import { PRICING_TIERS, FAQS } from "../../components/site/content";
import useSubscriptionPlans from "../../hooks/useSubscriptionPlans";
import { annualPriceFor, savingsPercent } from "../../utils/pricing";

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
  // Live prices from the admin Pricing tab, overlaid on the static tier content.
  // During prerender the effect doesn't run, so the static defaults render; the
  // client syncs to live amounts on hydration.
  const { plans: livePlans } = useSubscriptionPlans();
  const tiers = PRICING_TIERS.map((t) => {
    const monthlyPrice = livePlans[t.id]?.price ?? t.monthlyPrice;
    return {
      ...t,
      name: livePlans[t.id]?.name ?? t.name,
      description: livePlans[t.id]?.description ?? t.description,
      features: livePlans[t.id]?.features?.length ? livePlans[t.id].features : t.features,
      monthlyPrice,
      yearlyPrice: annualPriceFor(monthlyPrice, livePlans[t.id]?.priceAnnually ?? null),
    };
  });

  // Real savings % for the annual toggle, taken from the featured plan.
  const popular = tiers.find((t) => t.popular) ?? tiers.find((t) => t.monthlyPrice > 0);
  const savingsPct = popular ? savingsPercent(popular.monthlyPrice, popular.yearlyPrice) : 0;

  return (
    <div data-testid="site-pricing-page">
      <Seo
        title="Pricing"
        description="Simple, transparent pricing. Try ZalorTrade free for 7 days, then pick a plan — trade logging, advanced analytics, backtesting, and CSV import. Cancel anytime."
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
            Start with a 7-day free trial and upgrade when you're ready. No
            hidden fees, cancel anytime.
          </p>
          <div className="mt-8 flex justify-center">
            <PricingToggle cycle={cycle} onChange={setCycle} savingsPct={savingsPct} />
          </div>
        </div>
      </section>

      {/* Tiers — symmetric vertical padding so the card row sits centered in
          the background band instead of hugging its top edge. */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <PricingCard key={tier.id} tier={tier} cycle={cycle} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          All plans include secure cloud storage, dark mode, and access on every
          device. Prices are in USD — your bank may convert to your local
          currency at checkout.
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
