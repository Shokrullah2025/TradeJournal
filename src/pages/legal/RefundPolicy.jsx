import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const RefundPolicy = () => (
  <LegalPageWrapper
    title="Refund & Billing Policy"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="refund"
  >
    <p>
      This Refund & Billing Policy governs all payment, subscription, and billing matters for ZalorTrade, operated by <strong>ZalorTrade</strong>. This policy is incorporated by reference into our <Link to="/terms">Terms of Service</Link>.
    </p>
    <p>
      This policy complies with the FTC's Negative Option Rule (16 C.F.R. Part 425) and applicable state automatic-renewal laws, including California automatic renewal law (Cal. Bus. & Prof. Code § 17600 et seq.) for California subscribers.
    </p>

    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-5 py-4 my-6">
      <p className="font-bold text-red-900 dark:text-red-200 text-lg mb-2">
        STRICT NO-REFUND POLICY — ALL SALES FINAL
      </p>
      <p className="text-red-800 dark:text-red-300 font-medium">
        ALL SUBSCRIPTION CHARGES PAID TO ZalorTrade ARE FINAL AND NON-REFUNDABLE UNDER ANY CIRCUMSTANCES WHATSOEVER, INCLUDING BUT NOT LIMITED TO: CANCELLATION AT ANY TIME, UNUSED TIME IN A BILLING PERIOD, PLAN DOWNGRADE, ACCOUNT SUSPENSION FOR POLICY VIOLATIONS, DISSATISFACTION WITH THE SERVICE, FAILURE TO USE THE SERVICE, CHANGE OF MIND, OR ANY OTHER REASON. BY SUBSCRIBING, YOU EXPRESSLY ACKNOWLEDGE THIS NO-REFUND POLICY AND WAIVE ANY CLAIM TO A REFUND.
      </p>
    </div>

    <h2>1. All Charges Are Final — No Refunds</h2>
    <p>
      Once a subscription charge is processed, it is <strong>final and non-refundable</strong>. We do not issue refunds, credits, or pro-rated reimbursements for any reason, including but not limited to:
    </p>
    <ul>
      <li>You cancel your subscription partway through a billing period;</li>
      <li>You did not use the Service during a billing period;</li>
      <li>You downgrade from a higher-tier plan to a lower-tier plan;</li>
      <li>Your account is suspended or terminated due to violations of the <Link to="/terms">Terms of Service</Link> or <Link to="/aup">Acceptable Use Policy</Link>;</li>
      <li>You are dissatisfied with the Service for any reason;</li>
      <li>You experience technical difficulties (contact support at <strong>noreply@zalortrade.com</strong> for assistance — we will work to resolve issues);</li>
      <li>You forget to cancel before a renewal date; or</li>
      <li>Any other reason.</li>
    </ul>
    <p>
      This no-refund policy is a material term of your agreement with us, is clearly disclosed before you complete your purchase, and is enforceable to the maximum extent permitted by applicable law.
    </p>

    <h2>2. Auto-Renewal Disclosure</h2>
    <p>
      <strong>Required disclosure under applicable automatic-renewal laws and the FTC Negative Option Rule:</strong>
    </p>
    <ul>
      <li>Your ZalorTrade subscription <strong>automatically renews</strong> at the end of each billing period (monthly or annual, as selected at checkout).</li>
      <li>You will be charged the <strong>then-current subscription rate</strong> for your plan at the start of each new billing period.</li>
      <li>By completing your purchase, you <strong>authorize us and Stripe, Inc.</strong> to charge your payment method on a recurring basis until you cancel.</li>
      <li>Charges will appear on your statement as <strong>ZalorTrade</strong> or a similar descriptor.</li>
      <li>You may cancel at any time before the next renewal date to avoid being charged for the next period. Cancellation after a charge has been processed does not entitle you to a refund for that period.</li>
    </ul>

    <h2>3. Subscription Plans and Pricing</h2>
    <ul>
      <li><strong>Starter:</strong> $9.99/month or $90.00/year (save ~25%)</li>
      <li><strong>Pro:</strong> $18.00/month or $180.00/year (save ~17%)</li>
      <li><strong>Elite:</strong> $40.00/month or $360.00/year (save ~25%)</li>
    </ul>
    <p>
      All prices are in U.S. dollars and are exclusive of applicable taxes. You are responsible for all taxes imposed on your subscription by applicable law.
    </p>

    <h2>4. How to Cancel</h2>
    <p>
      You may cancel your subscription at any time through the <strong>Billing Portal</strong> accessible from your account settings. Upon cancellation:
    </p>
    <ul>
      <li>Your subscription will be set to cancel at the end of the current billing period;</li>
      <li>You will retain full access to the Service until the end of your paid period;</li>
      <li>You will not be charged for the next billing period;</li>
      <li>You will not receive a refund for any portion of the current billing period, regardless of how early in the period you cancel.</li>
    </ul>
    <p>
      If you experience any difficulty cancelling, contact us at <strong>noreply@zalortrade.com</strong> and we will assist you promptly.
    </p>

    <h2>5. Free Trials</h2>
    <p>
      If we offer a free trial, the following terms apply:
    </p>
    <ul>
      <li>At the end of the free trial period, your subscription automatically converts to a paid subscription at the applicable plan rate.</li>
      <li>We will charge your payment method on the first day after the trial expires.</li>
      <li>To avoid being charged, you must cancel <strong>before</strong> the trial period ends. Forgetting to cancel before trial expiration does not entitle you to a refund.</li>
      <li>Only one free trial per person or organization; we reserve the right to revoke trial access if we determine abuse.</li>
    </ul>

    <h2>6. Price Changes</h2>
    <p>
      We will provide <strong>at least 30 days' advance written notice</strong> (via email to your registered address) before changing subscription prices. Your continued use of the Service after the new pricing takes effect constitutes acceptance of the new price. If you do not accept the new price, cancel your subscription before the effective date; this does not entitle you to a refund for any previously paid period.
    </p>

    <h2>7. Failed Payments</h2>
    <p>
      If a payment fails (e.g., due to insufficient funds, expired card, or bank decline):
    </p>
    <ul>
      <li>Stripe will automatically retry the charge according to its retry schedule (typically retrying over several days).</li>
      <li>We will send you an email notification when a payment fails, prompting you to update your payment method.</li>
      <li>If all retries are exhausted and payment is not collected, your account will be <strong>suspended</strong> and you will lose access to the Service.</li>
      <li>You will have a grace period of <strong>7 days</strong> from the date of first payment failure to update your payment method and restore access.</li>
      <li>If payment is not resolved within the grace period, your account may be terminated.</li>
      <li>Any period of service received before payment failure is non-refundable.</li>
    </ul>
    <p>
      To update your payment method, go to Billing Portal in your account settings.
    </p>

    <h2>8. Chargebacks and Payment Disputes</h2>
    <p>
      By accepting these terms, you agree to contact us at <strong>noreply@zalortrade.com</strong> before initiating any chargeback or payment dispute with your bank or card issuer. Given our strict no-refund policy (which you acknowledged at the time of purchase), chargebacks are not an appropriate remedy and constitute a breach of your agreement with us.
    </p>
    <p>In the event of a chargeback:</p>
    <ul>
      <li>We will provide the payment processor with documentation of your purchase, these terms, and your acknowledgment at checkout;</li>
      <li>Your account will be <strong>immediately and permanently suspended</strong>;</li>
      <li>We reserve the right to pursue all available legal remedies for fraudulent chargebacks;</li>
      <li>You may be added to a fraud prevention list maintained by Stripe.</li>
    </ul>

    <h2>9. Taxes</h2>
    <p>
      You are solely responsible for all federal, state, and local taxes, levies, or duties imposed on your subscription. Where required by law, we may collect applicable sales tax and remit it to the relevant tax authority. The amount of any applicable taxes will be disclosed at checkout.
    </p>

    <h2>10. Payment Processing</h2>
    <p>
      All payments are processed by <strong>Stripe, Inc.</strong>, a third-party payment processor. Your payment card information is processed and stored by Stripe in accordance with PCI-DSS Level 1 standards. We do not store your full card number, CVV, or bank account routing numbers on our systems. By providing your payment information, you agree to <a href="https://stripe.com/legal/ssa" target="_blank" rel="noopener noreferrer">Stripe's Services Agreement</a>.
    </p>

    <h2>11. Questions About Your Bill</h2>
    <p>
      If you have questions about a charge, believe there is a billing error, or need to update your payment method, contact us before disputing with your bank:
    </p>
    <ul>
      <li><strong>Email:</strong> noreply@zalortrade.com</li>
      <li><strong>Company:</strong> ZalorTrade</li>
    </ul>
    <p>We aim to respond to billing inquiries within 2 business days.</p>
  </LegalPageWrapper>
);

export default RefundPolicy;
