import React from "react";
import PropTypes from "prop-types";
import { Disclosure } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "./content";

/**
 * Accessible FAQ accordion built on Headless UI's Disclosure (already a
 * project dependency). Each item expands/collapses independently.
 * Defaults to the pricing-page FAQS; pass `items` to render any other set
 * (e.g. the per-page FAQs on feature detail pages).
 */
const FAQAccordion = ({ items = FAQS, idPrefix = "faq" }) => (
  <div
    data-test-id={`${idPrefix}-accordion`}
    className="mx-auto max-w-3xl divide-y divide-gray-200 dark:divide-gray-700"
  >
    {items.map((faq, index) => (
      <Disclosure as="div" key={faq.question} className="py-4">
        {({ open }) => (
          <>
            <Disclosure.Button
              data-test-id={`${idPrefix}-question-${index}`}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </Disclosure.Button>
            <Disclosure.Panel
              data-test-id={`${idPrefix}-answer-${index}`}
              className="mt-3 pr-8 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            >
              {faq.answer}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    ))}
  </div>
);

FAQAccordion.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ),
  idPrefix: PropTypes.string,
};

export default FAQAccordion;
