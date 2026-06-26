import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const PrivacyPolicy = () => (
  <LegalPageWrapper
    title="Privacy Policy"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="privacy"
  >
    <p>
      This Privacy Policy describes how <strong>[COMPANY LEGAL NAME]</strong>, a Colorado limited liability company ("Company," "we," "us," or "our"), collects, uses, stores, and shares personal information when you use Tradgella (the "Service"). Our principal place of business is <strong>[PRINCIPAL ADDRESS]</strong>.
    </p>
    <p>
      This policy is aligned with the <strong>Colorado Privacy Act (CPA)</strong> (C.R.S. § 24-73-101 et seq., effective July 1, 2023), the <strong>California Consumer Privacy Act (CCPA)</strong> and <strong>California Privacy Rights Act (CPRA)</strong> (Cal. Civ. Code § 1798.100 et seq.), and includes <strong>GDPR-readiness provisions</strong> for users in the European Economic Area (EEA) and United Kingdom. By using the Service, you acknowledge the collection and use of information as described in this policy.
    </p>

    <h2>1. Data Controller Identity</h2>
    <p>
      For users in the EEA/UK: [COMPANY LEGAL NAME] is the data controller of your personal data. Our Data Protection contact is <strong>[CONTACT EMAIL]</strong>. We do not have a designated EU/UK representative at this time; for GDPR matters, please contact us directly.
    </p>

    <h2>2. Categories of Personal Data We Collect</h2>
    <p>We collect the following categories of personal information:</p>

    <h3>a. Account and Identity Data</h3>
    <ul>
      <li>Email address (required for account creation and login)</li>
      <li>First name and last name</li>
      <li>Display name (optional)</li>
      <li>Phone number (optional)</li>
      <li>Date of birth (optional)</li>
    </ul>

    <h3>b. Profile and Preference Data</h3>
    <ul>
      <li>Timezone, language, and currency preference</li>
      <li>Biography (optional)</li>
      <li>Profile avatar image (optional, stored in Supabase Storage)</li>
      <li>Notification preferences (email and in-app per category)</li>
    </ul>

    <h3>c. Address Data (Optional)</h3>
    <ul>
      <li>Street address, city, state/province, postal code, country</li>
      <li>Address type (home, business, billing, or shipping)</li>
    </ul>

    <h3>d. Trading Profile Data</h3>
    <ul>
      <li>Trading experience level (beginner through expert)</li>
      <li>Risk tolerance (conservative through very aggressive)</li>
      <li>Preferred markets and instruments</li>
      <li>Investment goals and trading style</li>
      <li>Account size range and primary broker</li>
      <li>Typical trading hours</li>
    </ul>

    <h3>e. Financial and Trade Data</h3>
    <ul>
      <li>Trading instrument names and types (stock, forex, futures, options, crypto, commodity)</li>
      <li>Trade direction (long or short)</li>
      <li>Trade quantity, entry price, exit price</li>
      <li>Stop-loss and take-profit levels</li>
      <li>Entry and exit dates and times</li>
      <li>Profit/loss (PnL) amounts</li>
      <li>Commission and swap costs</li>
      <li>Strategy tags, setup type, market condition labels, and notes (entered by you)</li>
      <li>Trade screenshot images (uploaded by you; max 5MB per file, stored in Supabase Storage)</li>
    </ul>

    <h3>f. Trading Account Data</h3>
    <ul>
      <li>Account name, associated broker, account number, and account type (demo, live, or paper)</li>
      <li>Base currency</li>
      <li>Initial and current account balances</li>
    </ul>

    <h3>g. Payment and Billing Data</h3>
    <ul>
      <li>Last four digits and brand (e.g., Visa) of your payment card (stored by Stripe on our behalf)</li>
      <li>Card expiry month and year</li>
      <li>Subscription plan, status, start/end dates</li>
      <li>Invoice amounts, currency, tax amounts, and payment dates</li>
      <li>Stripe customer ID and subscription ID (internal references)</li>
    </ul>
    <p>
      We do <strong>not</strong> store your full card number, CVV, or full bank account details. All payment card data is handled directly by Stripe, Inc. in accordance with PCI-DSS Level 1 standards.
    </p>

    <h3>h. Broker OAuth Tokens</h3>
    <ul>
      <li>OAuth access tokens and refresh tokens for connected broker platforms (Tradovate, Alpaca)</li>
      <li>Token type, scope, and expiry date</li>
    </ul>
    <p>
      Broker tokens are stored exclusively on our server-side infrastructure (Supabase Edge Functions environment). They are <strong>never</strong> transmitted to or stored in your browser.
    </p>

    <h3>i. Activity and Audit Log Data</h3>
    <ul>
      <li>IP address (IPv4 and IPv6)</li>
      <li>Browser user agent string</li>
      <li>Login timestamps and events</li>
      <li>Account actions (e.g., password changes, payment method updates, subscription changes)</li>
    </ul>

    <h3>j. Automatically Collected Data</h3>
    <ul>
      <li>Session authentication cookies (managed by Supabase Auth; see our <Link to="/cookies">Cookie Policy</Link>)</li>
      <li>Broker connection preferences stored in browser localStorage (non-sensitive: selected broker, sync preferences; no PII)</li>
    </ul>

    <h2>3. How We Use Your Personal Data</h2>
    <p>We use the data we collect for the following purposes:</p>
    <ul>
      <li><strong>Providing the Service:</strong> Authenticating your account, storing and displaying your trades and analytics, syncing trades from connected brokers, and enabling all Service features.</li>
      <li><strong>Processing payments:</strong> Creating your Stripe customer record, processing subscription charges, managing renewals, and sending billing confirmations.</li>
      <li><strong>Transactional communications:</strong> Sending security alerts (e.g., new login notifications), billing alerts (e.g., failed payment, upcoming renewal), broker connection status updates, and performance milestone notifications. These are sent only to the extent you have opted in per your notification preferences.</li>
      <li><strong>Security and fraud prevention:</strong> Monitoring for unauthorized access, rate-limiting login attempts, and maintaining audit logs.</li>
      <li><strong>Legal compliance:</strong> Retaining records as required by applicable law (e.g., accounting records, tax records, legal holds).</li>
      <li><strong>Improving the Service:</strong> Analyzing aggregate, anonymized usage patterns to identify bugs and improve features. We do not profile individual users for advertising purposes.</li>
    </ul>
    <p>We do <strong>not</strong> use your trade data or personal information to provide investment advice, sell advertising, or build profiles for resale to third parties.</p>

    <h2>4. Legal Basis for Processing (GDPR — EEA/UK Users)</h2>
    <p>For users in the EEA/UK, we process your personal data under the following legal bases:</p>
    <ul>
      <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing necessary to provide the Service you signed up for (account management, trade storage, billing).</li>
      <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Retaining billing records, responding to lawful government requests.</li>
      <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> Security monitoring, fraud prevention, audit logging, and improving the Service — subject to your rights to object.</li>
      <li><strong>Consent (Art. 6(1)(a)):</strong> Where you have specifically opted in to optional email notifications. You may withdraw consent at any time in your notification settings.</li>
    </ul>

    <h2>5. Data Processors and Sub-Processors</h2>
    <p>We share your personal data with the following third-party processors to operate the Service. All sub-processors are contractually required to protect your data in accordance with applicable law:</p>

    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Sub-Processor</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Purpose</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Location</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Supabase, Inc.", "Database (PostgreSQL), Auth, File Storage", "United States (AWS)"],
            ["Stripe, Inc.", "Payment processing, subscription management", "United States"],
            ["Resend, Inc.", "Transactional email delivery", "United States"],
            ["Yahoo! Inc. (Yahoo Finance)", "Historical market data for backtesting", "United States"],
            ["Alpha Vantage Inc.", "Daily OHLC market data", "United States"],
            ["Twelve Data", "Intraday candlestick market data", "United States"],
            ["Binance Holdings Ltd.", "Cryptocurrency market data for backtesting", "Cayman Islands"],
            ["Tradovate, LLC", "Broker OAuth authentication and trade data sync", "United States"],
            ["Alpaca Securities LLC", "Broker OAuth authentication and trade data sync", "United States"],
          ].map(([name, purpose, location]) => (
            <tr key={name} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600 font-medium">{name}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">{purpose}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">{location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="mt-3">
      We may add, remove, or change sub-processors. We will update this policy and, where required by law, notify affected users before making such changes.
    </p>

    <h2>6. Data Sharing and No Sale of Personal Data</h2>
    <p>
      We do <strong>not sell, rent, or share</strong> your personal data with third parties for their own marketing, advertising, or commercial purposes. We do not engage in targeted behavioral advertising using your personal data.
    </p>
    <p>We may share your data only in the following limited circumstances:</p>
    <ul>
      <li><strong>Sub-processors:</strong> As described in Section 5, solely to operate the Service.</li>
      <li><strong>Legal requirements:</strong> If required by law, court order, or lawful government request, we will disclose only what is legally required and will attempt to notify you where permitted.</li>
      <li><strong>Business transfer:</strong> In connection with a merger, acquisition, or sale of substantially all assets, your data may be transferred to the successor entity, subject to the same privacy protections. We will notify you via email and post a notice on the Service before any such transfer occurs.</li>
      <li><strong>Aggregate/anonymized data:</strong> We may share aggregate, de-identified statistics (e.g., "X% of users trade futures") that cannot reasonably be used to identify any individual.</li>
    </ul>

    <h2>7. Data Retention</h2>
    <ul>
      <li><strong>Active accounts:</strong> We retain all personal data and trade data for as long as your account is active.</li>
      <li><strong>After account deletion:</strong> Upon your request to delete your account, we will delete or anonymize all personal data and trade records within 30 days, except where retention is required by law.</li>
      <li><strong>Billing and invoice records:</strong> Retained for 7 years after your last transaction to comply with IRS recordkeeping requirements (26 U.S.C. § 6001) and Colorado tax law.</li>
      <li><strong>Audit logs:</strong> Retained for 2 years after the logged event to support security investigation and legal compliance needs.</li>
      <li><strong>Broker tokens:</strong> Deleted immediately upon you disconnecting the broker integration or deleting your account.</li>
    </ul>

    <h2>8. Security</h2>
    <p>We implement the following technical and organizational measures to protect your data:</p>
    <ul>
      <li>All data is encrypted at rest (AES-256) and in transit (TLS 1.2+) via Supabase's infrastructure.</li>
      <li>Row Level Security (RLS) is enforced on all database tables: your data is only accessible to your authenticated account.</li>
      <li>Passwords are hashed using bcrypt by Supabase Auth and are never stored in plaintext.</li>
      <li>Broker OAuth tokens are accessible only via server-side Supabase Edge Functions and are never exposed to the browser.</li>
      <li>Sensitive actions (login, password change, payment method updates, subscription changes) are logged in our audit table.</li>
      <li>Login attempts are rate-limited; accounts are temporarily locked after repeated failed attempts.</li>
    </ul>
    <p>
      No security measure is 100% effective. If you believe your account has been compromised, contact us immediately at <strong>[CONTACT EMAIL]</strong>.
    </p>

    <h2>9. Cookies and Local Storage</h2>
    <p>See our full <Link to="/cookies">Cookie Policy</Link> for detail. In summary:</p>
    <ul>
      <li>We use strictly necessary authentication cookies set by Supabase Auth (<code>sb-*-auth-token</code>). These are required for login and cannot be disabled without breaking the Service.</li>
      <li>We use browser localStorage only to store non-sensitive broker connection preferences (e.g., selected broker name, sync interval). No PII or tokens are stored in localStorage.</li>
      <li>We do <strong>not</strong> use analytics cookies, advertising cookies, or third-party tracking pixels.</li>
    </ul>

    <h2>10. Your Rights — Colorado Privacy Act (CPA)</h2>
    <p>
      Under the Colorado Privacy Act (C.R.S. § 24-73-101 et seq.), Colorado residents have the following rights:
    </p>
    <ul>
      <li><strong>Right to Access:</strong> You may request to know what personal data we hold about you.</li>
      <li><strong>Right to Correction:</strong> You may request correction of inaccurate personal data.</li>
      <li><strong>Right to Deletion:</strong> You may request deletion of your personal data, subject to certain exceptions (e.g., legal retention obligations).</li>
      <li><strong>Right to Portability:</strong> You may request your data in a portable format. Tradgella offers a data export feature in your account settings.</li>
      <li><strong>Right to Opt Out of Targeted Advertising and Sale:</strong> We do not sell personal data or engage in targeted advertising, so this right is not applicable. You may still contact us to confirm this.</li>
    </ul>
    <p>
      To exercise any of these rights, email <strong>[CONTACT EMAIL]</strong> with the subject line "Colorado Privacy Request." We will respond within 45 days as required by the CPA (extendable by 45 additional days with notice).
    </p>
    <p>
      If you believe we have not honored your rights under the Colorado Privacy Act, you may lodge a complaint with the Colorado Attorney General's Office.
    </p>

    <h2>11. Your Rights — California (CCPA/CPRA)</h2>
    <p>
      If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) grant you additional rights:
    </p>
    <ul>
      <li><strong>Right to Know:</strong> The categories and specific pieces of personal information we collect, the sources, the business purposes, and the categories of third parties with whom we share it (see Sections 2, 3, and 5 above).</li>
      <li><strong>Right to Delete:</strong> Request deletion of your personal information, subject to exceptions.</li>
      <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information.</li>
      <li><strong>Right to Opt Out of Sale or Sharing:</strong> We do not sell or share personal information for cross-context behavioral advertising. No opt-out is necessary, but you may confirm this at any time by contacting us.</li>
      <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> We do not use sensitive personal information (as defined by CPRA) beyond what is necessary to provide the Service.</li>
      <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA/CPRA rights.</li>
    </ul>
    <p>
      California residents may submit requests via email to <strong>[CONTACT EMAIL]</strong>. We will respond within 45 days.
    </p>

    <h2>12. Your Rights — GDPR (EEA and UK Users)</h2>
    <p>
      If you are located in the European Economic Area or United Kingdom, you have the following rights under the General Data Protection Regulation (GDPR) or UK GDPR:
    </p>
    <ul>
      <li><strong>Right of access (Art. 15):</strong> Request a copy of your personal data and information about how we process it.</li>
      <li><strong>Right to rectification (Art. 16):</strong> Request correction of inaccurate data.</li>
      <li><strong>Right to erasure / right to be forgotten (Art. 17):</strong> Request deletion of your data where there is no overriding legal basis for retention.</li>
      <li><strong>Right to restriction of processing (Art. 18):</strong> Request that we limit how we use your data in certain circumstances.</li>
      <li><strong>Right to data portability (Art. 20):</strong> Receive your data in a structured, machine-readable format.</li>
      <li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests.</li>
      <li><strong>Right to withdraw consent:</strong> Where processing is based on consent (e.g., optional email notifications), you may withdraw at any time in your notification settings without affecting the lawfulness of prior processing.</li>
      <li><strong>Right to lodge a complaint:</strong> You may lodge a complaint with your local supervisory authority (e.g., the UK Information Commissioner's Office for UK users).</li>
    </ul>

    <h3>International Data Transfers</h3>
    <p>
      If you are in the EEA or UK, your data is transferred to and processed in the United States. We rely on the following transfer mechanisms where required: Standard Contractual Clauses (SCCs) adopted by the European Commission for transfers to Supabase, Stripe, and Resend. By using the Service, you acknowledge this transfer. If you have questions about data transfer mechanisms, contact us at <strong>[CONTACT EMAIL]</strong>.
    </p>

    <h2>13. Children's Privacy</h2>
    <p>
      The Service is not directed at children under 18 years of age. We do not knowingly collect personal information from persons under 18. If you are under 18, do not use the Service. If we learn that we have collected personal information from a person under 18, we will delete it promptly. If you believe we have inadvertently collected data from a minor, contact us at <strong>[CONTACT EMAIL]</strong>.
    </p>
    <p>
      The Children's Online Privacy Protection Act (COPPA) applies to websites directed at children under 13. The Service is not directed at that age group.
    </p>

    <h2>14. Do Not Track</h2>
    <p>
      We do not currently respond to "Do Not Track" signals from browsers because we do not engage in cross-site tracking. We do not track users across third-party websites.
    </p>

    <h2>15. Changes to This Privacy Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. For material changes, we will provide at least 30 days' advance notice by email to your registered address. The "Last updated" date at the top of this page reflects when the policy was last revised. Your continued use of the Service after the effective date of an updated policy constitutes your acceptance of the changes.
    </p>

    <h2>16. Contact and Data Protection Inquiries</h2>
    <p>For any privacy questions, access requests, or data deletion requests:</p>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL]</li>
      <li><strong>Company:</strong> [COMPANY LEGAL NAME]</li>
      <li><strong>Address:</strong> [PRINCIPAL ADDRESS]</li>
    </ul>
    <p>
      We will acknowledge your request within 5 business days and respond substantively within the timeframes required by applicable law.
    </p>
  </LegalPageWrapper>
);

export default PrivacyPolicy;
