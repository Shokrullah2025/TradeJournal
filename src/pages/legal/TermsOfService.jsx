import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const TermsOfService = () => (
  <LegalPageWrapper
    title="Terms of Service"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="terms"
  >
    <p>
      Please read these Terms of Service ("Terms") carefully before using Tradgella (the "Service") operated by{" "}
      <strong>[COMPANY LEGAL NAME]</strong>, a Colorado limited liability company ("Company," "we," "us," or "our"), located at{" "}
      <strong>[PRINCIPAL ADDRESS]</strong>.
    </p>
    <p>
      By creating an account, clicking "I Agree," or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{" "}
      <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
    </p>

    <h2>1. Eligibility</h2>
    <p>
      You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are 18 or older, that you have the legal capacity to enter into a binding contract, and that you are not prohibited from using the Service under any applicable law. The Service is not directed at persons under 18, and we do not knowingly collect personal information from minors.
    </p>

    <h2>2. Account Registration and Security</h2>
    <p>
      You must provide accurate, complete, and current information when creating an account. You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately at <strong>[CONTACT EMAIL]</strong> if you suspect any unauthorized access to your account. We are not liable for any loss or damage arising from your failure to protect your credentials.
    </p>
    <p>
      We reserve the right to suspend or terminate accounts at our discretion, including if we reasonably believe an account is being used fraudulently, in violation of these Terms, or in a manner that may harm the Company or other users.
    </p>

    <h2>3. Subscription Plans and Fees</h2>
    <p>Tradgella offers the following subscription plans (prices in USD):</p>
    <ul>
      <li><strong>Basic — $9.99/month or $99.90/year:</strong> Up to 100 trades per month, 1 trading account, basic analytics, email support.</li>
      <li><strong>Pro — $19.99/month or $199.90/year:</strong> Unlimited trades, up to 3 trading accounts, advanced analytics, data export, priority support.</li>
      <li><strong>Enterprise — $49.99/month or $499.90/year:</strong> Everything in Pro, plus team collaboration, custom integrations, up to 10 trading accounts, dedicated phone support.</li>
    </ul>
    <p>
      We reserve the right to modify plan features, pricing, or available tiers at any time with at least 30 days' advance notice to existing subscribers. Pricing displayed on the Service at the time of purchase governs your initial subscription term.
    </p>

    <h2>4. Billing, Auto-Renewal, and Payment Authorization</h2>
    <p>
      <strong>Auto-Renewal Disclosure (required under Colorado Revised Statutes § 6-1-732):</strong> Your subscription automatically renews at the end of each billing period (monthly or annual, as selected at checkout) at the then-current rate for your plan unless you cancel before the renewal date. By subscribing, you authorize [COMPANY LEGAL NAME] and its payment processor, Stripe, Inc., to charge the payment method you provide on a recurring basis for the applicable subscription fee plus any applicable taxes.
    </p>
    <p>
      All payments are processed by Stripe, Inc. and are subject to <a href="https://stripe.com/legal/ssa" target="_blank" rel="noopener noreferrer">Stripe's terms of service</a>. We do not store your full payment card number; Stripe stores payment method information on our behalf in accordance with PCI-DSS standards.
    </p>
    <p>
      You represent that you are authorized to use the payment method you provide and that the billing information you supply is accurate and complete.
    </p>

    <h2>5. Strict No-Refund Policy</h2>
    <p className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 font-medium">
      ALL SUBSCRIPTION CHARGES ARE FINAL AND NON-REFUNDABLE UNDER ANY CIRCUMSTANCES WHATSOEVER. THIS INCLUDES BUT IS NOT LIMITED TO: CANCELLATION OF YOUR SUBSCRIPTION AT ANY TIME, UNUSED SUBSCRIPTION TIME REMAINING IN A BILLING PERIOD, DOWNGRADE TO A LOWER PLAN, VOLUNTARY OR INVOLUNTARY ACCOUNT SUSPENSION OR TERMINATION (INCLUDING TERMINATION FOR VIOLATION OF THESE TERMS), DISSATISFACTION WITH THE SERVICE, FAILURE TO USE THE SERVICE, OR ANY OTHER REASON. BY COMPLETING YOUR PURCHASE AND CHECKING THE ACKNOWLEDGMENT BOX AT REGISTRATION, YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT YOU ARE NOT ENTITLED TO ANY REFUND UNDER ANY CIRCUMSTANCES.
    </p>
    <p>
      This no-refund policy is clearly disclosed at the point of purchase and is a material term of your agreement with us. Under Colorado law (Colorado Revised Statutes § 4-2-719), we are permitted to limit your remedies, and this limitation is reasonable given the nature of the digital Service.
    </p>

    <h2>6. Cancellation</h2>
    <p>
      You may cancel your subscription at any time through the Billing Portal accessible from your account settings. Upon cancellation, your subscription will not renew for the next billing period, but you will retain access to the Service through the end of your current paid billing period. Cancellation does not entitle you to any refund, credit, or pro-rated reimbursement for any unused portion of the current billing period.
    </p>

    <h2>7. Free Trials</h2>
    <p>
      We may, at our discretion, offer free trial periods. At the conclusion of a free trial, your subscription will automatically convert to a paid subscription at the applicable plan rate unless you cancel before the trial period ends. If you do not cancel before the trial ends, you will be charged and the no-refund policy in Section 5 applies.
    </p>

    <h2>8. Price Changes</h2>
    <p>
      We will provide at least 30 days' advance written notice (via email to your registered address) of any change in subscription pricing. Your continued use of the Service after the new pricing takes effect constitutes acceptance of the new price. If you do not accept the new price, you may cancel your subscription before the new pricing takes effect; cancellation does not entitle you to any refund for the current billing period.
    </p>

    <h2>9. License Grant</h2>
    <p>
      Subject to these Terms and your timely payment of applicable fees, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your personal or internal business recordkeeping and trading performance analysis. This license does not include the right to: (a) sublicense, resell, or distribute the Service; (b) copy, modify, or create derivative works of the Service; (c) access the Service to build a competing product; or (d) use automated tools to scrape or extract data from the Service beyond what is permitted by any official export feature.
    </p>

    <h2>10. User Content and Data Ownership</h2>
    <p>
      You retain ownership of all trade data, notes, images, and other content you upload or enter into the Service ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and display your User Content solely as necessary to provide the Service to you. We will not sell your User Content to third parties or use it for purposes other than operating the Service.
    </p>
    <p>
      You represent and warrant that your User Content does not infringe any third-party intellectual property rights and does not violate any applicable law.
    </p>

    <h2>11. Intellectual Property</h2>
    <p>
      All software, code, interfaces, designs, trademarks, logos, and proprietary content comprising the Service (excluding User Content) are owned by [COMPANY LEGAL NAME] and are protected by United States and Colorado copyright law, trademark law, and other applicable intellectual property laws. Nothing in these Terms transfers any ownership right in the Service to you.
    </p>

    <h2>12. Prohibited Uses</h2>
    <p>You agree not to use the Service to:</p>
    <ul>
      <li>Violate any federal, Colorado, or other applicable state or foreign law or regulation;</li>
      <li>Enter false, fabricated, or misleading trade data for fraudulent purposes;</li>
      <li>Attempt to gain unauthorized access to any part of the Service or its underlying infrastructure;</li>
      <li>Reverse engineer, decompile, or disassemble any component of the Service;</li>
      <li>Circumvent subscription limits, access controls, or billing mechanisms;</li>
      <li>Share, resell, or sublicense your account credentials;</li>
      <li>Upload malicious code, viruses, or content that infringes third-party intellectual property rights;</li>
      <li>Harass, threaten, or abuse Company personnel or other users.</li>
    </ul>
    <p>
      See our <Link to="/aup">Acceptable Use Policy</Link> for additional detail.
    </p>

    <h2>13. Broker Integrations and Third-Party Services</h2>
    <p>
      The Service offers optional integrations with third-party broker platforms, including Tradovate and Alpaca Securities (collectively "Brokers"). These Brokers are independent companies not affiliated with [COMPANY LEGAL NAME]. By connecting a broker account, you authorize us to retrieve your trade history from that broker on your behalf using OAuth.
    </p>
    <p>
      We are not responsible for: (a) any changes to a Broker's API, data format, or authentication methods that disrupt the integration; (b) errors or omissions in data provided by a Broker; (c) any trading losses, missed opportunities, or financial harm arising directly or indirectly from a broker sync error, delayed sync, or failed sync; (d) any action taken by a Broker with respect to your account. Your use of any broker integration is governed by the terms of service of the applicable Broker.
    </p>
    <p>
      Market data used in the backtesting feature is sourced from third-party providers (Yahoo Finance, Alpha Vantage, Twelve Data, Binance). This data is provided for informational purposes only and may contain errors, delays, or gaps. We make no warranty as to its accuracy, completeness, or fitness for any purpose.
    </p>

    <h2>14. Financial and Trading Disclaimer</h2>
    <p>
      Tradgella is a trade recordkeeping and performance analytics tool. It does NOT provide investment advice, trading recommendations, financial advice, or signals of any kind. Nothing on this platform should be construed as a recommendation to buy, sell, or hold any security, commodity, cryptocurrency, or financial instrument. See our full <Link to="/disclaimer">Financial & Risk Disclaimer</Link>.
    </p>

    <h2>15. Disclaimers of Warranties</h2>
    <p className="font-medium">
      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE COLORADO AND FEDERAL LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT: (A) THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE; (B) TRADE DATA OR ANALYTICS WILL BE ACCURATE OR COMPLETE; (C) ANY DEFECTS WILL BE CORRECTED; OR (D) THE SERVICE WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS.
    </p>
    <p>
      Some jurisdictions do not allow the exclusion of implied warranties. To the extent such exclusions are not permitted in your jurisdiction, they apply only to the fullest extent permitted by law.
    </p>

    <h2>16. Limitation of Liability</h2>
    <p className="font-medium">
      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL [COMPANY LEGAL NAME], ITS MEMBERS, MANAGERS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, TRADING LOSSES, OR ANY OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF (OR INABILITY TO USE) THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
    </p>
    <p className="font-medium">
      IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO US IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
    </p>
    <p>
      This limitation of liability reflects a reasonable allocation of risk. Some states do not allow the limitation of certain damages; if applicable law prevents enforcement of any part of this section, that part shall be reformed to the minimum extent necessary to make it enforceable, and the remaining provisions shall remain in full force.
    </p>

    <h2>17. Indemnification</h2>
    <p>
      You agree to defend, indemnify, and hold harmless [COMPANY LEGAL NAME] and its members, managers, employees, agents, licensors, and service providers from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to: (a) your use of the Service; (b) your User Content; (c) your violation of these Terms; (d) your violation of any third-party right, including any intellectual property right or privacy right; or (e) any claim that your User Content caused damage to a third party.
    </p>

    <h2>18. Chargebacks and Payment Disputes</h2>
    <p>
      Initiating a chargeback or payment dispute through your bank or card issuer without first contacting us at <strong>[CONTACT EMAIL]</strong> to attempt resolution is a material breach of these Terms. You acknowledge the no-refund policy described in Section 5. In the event of a chargeback, we reserve the right to: (a) provide the payment processor with documentation of your purchase and acceptance of these Terms; (b) immediately and permanently terminate your account; and (c) pursue any remedies available to us under applicable law.
    </p>

    <h2>19. Dispute Resolution — Binding Arbitration and Class Action Waiver</h2>
    <p>
      <strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY TRIAL.</strong>
    </p>
    <p>
      <strong>Agreement to Arbitrate:</strong> Except as provided below, any dispute, controversy, or claim arising out of or relating to these Terms, your use of the Service, or the breach, termination, enforcement, interpretation, or validity of these Terms shall be resolved exclusively by binding individual arbitration administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules then in effect, with the arbitration seat in Denver, Colorado. The Federal Arbitration Act (9 U.S.C. § 1 et seq.) governs the interpretation and enforcement of this Section. Judgment upon any arbitration award may be entered in any court having jurisdiction.
    </p>
    <p>
      <strong>Class Action Waiver:</strong> YOU AND [COMPANY LEGAL NAME] EACH AGREE THAT ANY DISPUTE RESOLUTION PROCEEDING WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT AS A CLASS, CONSOLIDATED, MASS, OR REPRESENTATIVE ACTION. YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION OR CLASS-WIDE ARBITRATION. If any court finds this class action waiver unenforceable as to a particular claim, that claim shall be severed from arbitration and litigated in court; all other claims remain subject to arbitration.
    </p>
    <p>
      <strong>Small Claims Court:</strong> Either party may bring an individual claim in small claims court in Denver, Colorado, so long as the claim remains in small claims court and is not transferred or appealed to a court of general jurisdiction.
    </p>
    <p>
      <strong>Exceptions:</strong> Either party may seek emergency injunctive or other equitable relief from a court of competent jurisdiction to prevent actual or threatened infringement, misappropriation, or violation of intellectual property rights.
    </p>
    <p>
      <strong>Time Limit:</strong> Any claim must be filed within one (1) year of the date the cause of action accrued. Claims filed after this period are time-barred.
    </p>
    <p>
      <strong>Opt-Out:</strong> You may opt out of this arbitration agreement by sending written notice to <strong>[CONTACT EMAIL]</strong> within 30 days of first accepting these Terms. Your opt-out notice must include your name, email address, and a clear statement that you wish to opt out of arbitration.
    </p>

    <h2>20. Governing Law and Venue</h2>
    <p>
      These Terms are governed by and construed in accordance with the laws of the State of Colorado, without regard to its conflict-of-law principles. For any dispute not subject to arbitration under Section 19, you and [COMPANY LEGAL NAME] submit to the exclusive jurisdiction of the state and federal courts located in Denver County, Colorado. The United Nations Convention on Contracts for the International Sale of Goods does not apply to these Terms.
    </p>

    <h2>21. Termination</h2>
    <p>
      We may suspend or terminate your access to the Service at any time and for any reason, including for violation of these Terms, non-payment, or conduct we determine is harmful to other users or the Company. Upon termination for cause (such as AUP or Terms violations), you are not entitled to any refund. You may terminate your account at any time by cancelling your subscription and contacting us at <strong>[CONTACT EMAIL]</strong> to request account deletion. Upon account deletion, we will delete your personal data in accordance with our <Link to="/privacy">Privacy Policy</Link>.
    </p>

    <h2>22. Changes to These Terms</h2>
    <p>
      We reserve the right to modify these Terms at any time. For material changes, we will provide at least 14 days' advance notice by email to your registered address and/or by posting a prominent notice within the Service. Your continued use of the Service after the effective date of the revised Terms constitutes acceptance. If you do not accept the revised Terms, you must cancel your subscription and stop using the Service before the effective date.
    </p>

    <h2>23. Severability and Waiver</h2>
    <p>
      If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force. Our failure to enforce any right or provision of these Terms is not a waiver of that right or provision.
    </p>

    <h2>24. Entire Agreement</h2>
    <p>
      These Terms, together with our <Link to="/privacy">Privacy Policy</Link>, <Link to="/disclaimer">Financial & Risk Disclaimer</Link>, <Link to="/refund">Refund & Billing Policy</Link>, <Link to="/aup">Acceptable Use Policy</Link>, and <Link to="/cookies">Cookie Policy</Link>, constitute the entire agreement between you and [COMPANY LEGAL NAME] with respect to the Service and supersede all prior or contemporaneous agreements, representations, warranties, and understandings.
    </p>

    <h2>25. Contact Information</h2>
    <p>For questions about these Terms, please contact us:</p>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL]</li>
      <li><strong>Company:</strong> [COMPANY LEGAL NAME]</li>
      <li><strong>Address:</strong> [PRINCIPAL ADDRESS]</li>
    </ul>
  </LegalPageWrapper>
);

export default TermsOfService;
