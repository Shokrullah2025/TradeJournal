import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Bottom-of-page conversion band. Adapts to auth state so signed-in users
 * get a path back into the app instead of a sign-up prompt.
 */
const CTASection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section
      data-test-id="site-cta-section"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"
    >
      <div className="relative overflow-hidden rounded-3xl bg-primary-600 px-6 py-14 text-center sm:px-12">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start journaling your edge today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            Join traders who turned scattered notes into a measurable, repeatable
            process. It's free to begin — no credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-test-id="site-cta-dashboard-btn"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Go to your dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/register"
                data-test-id="site-cta-getstarted-btn"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Start journaling free
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
