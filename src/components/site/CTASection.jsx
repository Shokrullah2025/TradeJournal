import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Bottom-of-page conversion band (landing design: Evergreen gradient card with
 * a primary and a secondary action). Adapts to auth state so signed-in users
 * get a path back into the app instead of a sign-up prompt.
 */
const CTASection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section
      data-test-id="site-cta-section"
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"
    >
      <div className="rounded-3xl bg-gradient-to-br from-accent-400 via-accent-500 to-accent-700 px-6 py-14 text-center text-white shadow-2xl shadow-accent-600/30 sm:px-12">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Stop guessing. Start journaling with an edge.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base opacity-90 sm:text-lg">
          Turn scattered notes into a measurable, repeatable process. Start
          with a 7-day free trial and keep it only if it pays for itself.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-test-id="site-cta-dashboard-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-accent-700 transition-transform hover:-translate-y-px"
            >
              Go to your dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/register"
              data-test-id="site-cta-getstarted-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-accent-700 transition-transform hover:-translate-y-px"
            >
              Start free trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/contact"
            data-test-id="site-cta-contact-btn"
            className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/25"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
