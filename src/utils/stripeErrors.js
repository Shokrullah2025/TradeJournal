// Maps a Stripe.js error (from confirmSetup / confirmPayment) to a clear,
// user-facing message. Stripe's own `error.message` is already human-readable,
// so we fall back to it — but we override the common cases with friendlier,
// action-oriented wording and keep declines generic where revealing the exact
// reason (e.g. lost/stolen card) would help a fraudster.
//
// See https://stripe.com/docs/error-codes and the `decline_code` list.

const DECLINE_MESSAGES = {
  insufficient_funds:
    "Your card was declined due to insufficient funds. Please use a different card.",
  expired_card:
    "Your card has expired. Please use a different card.",
  incorrect_cvc:
    "Your card's security code (CVC) is incorrect. Please check it and try again.",
  incorrect_number:
    "Your card number is incorrect. Please check it and try again.",
  card_velocity_exceeded:
    "Your card was declined — too many attempts. Please wait a moment, then try again.",
  // Generic-by-design (do not reveal lost/stolen/fraud reasons to the cardholder)
  lost_card: "Your card was declined. Please contact your bank or use a different card.",
  stolen_card: "Your card was declined. Please contact your bank or use a different card.",
  pickup_card: "Your card was declined. Please contact your bank or use a different card.",
};

const CODE_MESSAGES = {
  expired_card: "Your card has expired. Please use a different card.",
  incorrect_cvc: "Your card's security code (CVC) is incorrect. Please check it and try again.",
  invalid_cvc: "Your card's security code (CVC) is invalid. Please check it and try again.",
  incorrect_number: "Your card number is incorrect. Please check it and try again.",
  invalid_number: "Your card number is invalid. Please check it and try again.",
  invalid_expiry_month: "Your card's expiration month is invalid.",
  invalid_expiry_year: "Your card's expiration year is invalid.",
  incorrect_zip: "Your card's ZIP/postal code is incorrect. Please check it and try again.",
  processing_error: "An error occurred while processing your card. Please try again in a moment.",
  authentication_required:
    "Your card requires authentication. Please complete the verification and try again.",
};

export function formatStripeError(error) {
  if (!error) return "We couldn't verify your card. Please try again.";

  // A decline carries the most specific reason in `decline_code`.
  if (error.code === "card_declined" && error.decline_code) {
    return (
      DECLINE_MESSAGES[error.decline_code] ||
      "Your card was declined. Please try a different card or contact your bank."
    );
  }

  if (error.code && CODE_MESSAGES[error.code]) {
    return CODE_MESSAGES[error.code];
  }

  // Field/format problems (incomplete number, etc.) — Stripe's message is clear.
  if (error.type === "validation_error" && error.message) {
    return error.message;
  }

  // Fall back to Stripe's own human-readable message, then a safe generic.
  return error.message || "We couldn't verify your card. Please try again.";
}

export default formatStripeError;
