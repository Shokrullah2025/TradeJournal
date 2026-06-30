import React from "react";
import { Quote } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { TESTIMONIALS } from "./content";

/**
 * Social-proof section. Quotes are representative/generic examples rather than
 * attributed real customers.
 */
const Testimonials = () => (
  <section
    data-test-id="site-testimonials"
    className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
  >
    <SectionHeading
      eyebrow="Loved by traders"
      title="Built for people who take their trading seriously"
      subtitle="A journal you'll actually keep — because it pays you back in insight."
    />

    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
      {TESTIMONIALS.map((item, index) => (
        <figure
          key={item.name}
          data-test-id={`site-testimonial-${index}`}
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <Quote className="h-7 w-7 text-primary-300 dark:text-primary-700" />
          <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            “{item.quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {item.name.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.name}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {item.role}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export default Testimonials;
