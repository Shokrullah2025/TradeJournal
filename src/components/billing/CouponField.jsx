import React, { useState } from "react";
import PropTypes from "prop-types";
import { Tag, Check, Loader2, X } from "lucide-react";
import { useBilling } from "../../context/BillingContext";

// A coupon input used at trial activation and paid checkout. On "Apply" it
// validates the code against Stripe (via BillingContext.validateCoupon) and only
// reports it up through onApply if it's a real, active promotion code — so an
// invalid code can never ride through to the subscription. The parent passes the
// applied code into startTrial / createCheckoutSession, where it's validated
// again server-side before the discount is applied.
const CouponField = ({ onApply, onClear, disabled }) => {
  const { validateCoupon } = useBilling();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState(null); // { code, label }
  const [error, setError] = useState("");

  const apply = async () => {
    const c = code.trim();
    if (!c) {
      setError("Enter a coupon code.");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const res = await validateCoupon(c);
      if (res?.valid) {
        setApplied({ code: res.code, label: res.label });
        onApply?.(res.code);
      } else {
        setError(
          res?.reason === "expired"
            ? "This coupon has expired."
            : "That coupon code isn't valid.",
        );
        setApplied(null);
        onClear?.();
      }
    } catch (err) {
      setError(err.message || "Couldn't check that coupon. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const clear = () => {
    setApplied(null);
    setCode("");
    setError("");
    onClear?.();
  };

  if (applied) {
    return (
      <div
        className="flex items-center justify-between rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2"
        data-testid="coupon-applied"
      >
        <span className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>
            <span className="font-semibold">{applied.code}</span>
            {applied.label ? ` — ${applied.label}` : ""}
          </span>
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          data-testid="coupon-remove-btn"
          aria-label="Remove coupon"
          className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="Coupon code"
            disabled={disabled || checking}
            data-testid="coupon-input"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={disabled || checking || !code.trim()}
          data-testid="coupon-apply-btn"
          className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" data-testid="coupon-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

CouponField.propTypes = {
  onApply: PropTypes.func,
  onClear: PropTypes.func,
  disabled: PropTypes.bool,
};

export default CouponField;
