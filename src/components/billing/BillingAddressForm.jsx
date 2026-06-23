import React, { useState } from "react";
import { Elements, AddressElement, useElements } from "@stripe/react-stripe-js";
import PropTypes from "prop-types";
import { MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import { stripePromise } from "../../lib/stripe";

// Maps an ISO-2 country to the Stripe tax-ID type used for reverse-charge /
// business invoicing. Only the common jurisdictions are listed — anything not
// here simply skips the optional tax ID (the address alone still drives tax).
const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

const taxIdTypeForCountry = (country) => {
  if (!country) return null;
  if (EU_COUNTRIES.includes(country)) return "eu_vat";
  const map = {
    GB: "gb_vat", AU: "au_abn", NZ: "nz_gst", CH: "ch_vat", NO: "no_vat",
    AE: "ae_trn", IN: "in_gst", ZA: "za_vat", SG: "sg_gst", CA: "ca_gst_hst",
    US: "us_ein",
  };
  return map[country] ?? null;
};

const AddressFields = ({ onSubmit, onCancel, isSubmitting }) => {
  const elements = useElements();
  const [taxIdValue, setTaxIdValue] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!elements) return;

    const addressElement = elements.getElement("address");
    const { complete, value } = await addressElement.getValue();
    if (!complete) {
      toast.error("Please complete your billing address.");
      return;
    }

    const country = value.address?.country;
    const type = taxIdTypeForCountry(country);
    const taxId =
      taxIdValue.trim() && type ? { type, value: taxIdValue.trim() } : null;

    onSubmit({ address: value.address, name: value.name, taxId });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="billing-address-form"
    >
      <AddressElement options={{ mode: "billing" }} />

      <div>
        <label
          htmlFor="billing-tax-id"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          VAT / Tax ID <span className="text-gray-400">(optional, for businesses)</span>
        </label>
        <input
          id="billing-tax-id"
          type="text"
          value={taxIdValue}
          onChange={(e) => setTaxIdValue(e.target.value)}
          placeholder="e.g. DE123456789"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="billing-address-tax-id-input"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-md p-3">
        <MapPin className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <span>
          We use your address to calculate the correct VAT/GST for your country.
          The tax is shown before you pay.
        </span>
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
          data-testid="billing-address-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          data-testid="billing-address-continue-btn"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Preparing checkout…
            </span>
          ) : (
            "Continue to payment"
          )}
        </button>
      </div>
    </form>
  );
};

AddressFields.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

// `mode: 'setup'` lets the AddressElement mount without a PaymentIntent — we
// only need to collect the address here; the PaymentElement comes next step.
const BillingAddressForm = ({ onSubmit, onCancel, isSubmitting }) => (
  <Elements stripe={stripePromise} options={{ mode: "setup", currency: "usd" }}>
    <AddressFields
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
    />
  </Elements>
);

BillingAddressForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

export default BillingAddressForm;
