import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DashboardPreview from "./DashboardPreview";

/**
 * Landing hero: headline, subcopy, primary/secondary CTAs, and a live-looking
 * dashboard mock. The primary CTA adapts to auth state so signed-in visitors
 * are sent straight into the app.
 */
const Hero = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-100/60 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              Journal · Analyse · Improve
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
              Trade with a{" "}
              <span className="text-gradient">data-driven edge</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-400 lg:mx-0">
              Tradgella turns your trades into insight. Log or auto-sync
              every fill, see the metrics that reveal your real edge, and
              backtest new ideas — all in one fast, beautiful workspace.
            </p>

            {/* Trust bullets */}
            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:flex-wrap sm:justify-center lg:mx-0 lg:justify-start">
              {[
                "Free plan, no card required",
                "Automatic broker sync",
                "Your data stays yours",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  data-test-id="site-hero-dashboard-btn"
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-base sm:w-auto"
                >
                  Go to your dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  data-test-id="site-hero-getstarted-btn"
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-base sm:w-auto"
                >
                  Start journaling free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              <Link
                to="/features"
                data-test-id="site-hero-features-btn"
                className="btn btn-ghost inline-flex w-full items-center justify-center gap-2 border border-gray-200 px-6 py-3 text-base dark:border-gray-700 sm:w-auto"
              >
                <PlayCircle className="h-5 w-5" />
                See the features
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary-500/10 blur-2xl" />
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
