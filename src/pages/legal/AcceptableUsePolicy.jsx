import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const AcceptableUsePolicy = () => (
  <LegalPageWrapper
    title="Acceptable Use Policy"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="aup"
  >
    <p>
      This Acceptable Use Policy ("AUP") governs your use of Trade Journal Pro (the "Service") operated by <strong>[COMPANY LEGAL NAME]</strong>, a Colorado limited liability company. This AUP is incorporated by reference into our <Link to="/terms">Terms of Service</Link> and is part of the binding agreement between you and the Company.
    </p>
    <p>
      The purpose of this AUP is to protect the security, integrity, and availability of the Service for all users, and to ensure the Service is not used for unlawful or harmful purposes.
    </p>

    <h2>1. Scope</h2>
    <p>
      This AUP applies to all access to and use of Trade Journal Pro, including your account, any API integrations, broker connections, file uploads, data entries, and any automated or manual interaction with the Service.
    </p>

    <h2>2. Prohibited Activities</h2>
    <p>You agree that you will NOT:</p>

    <h3>a. Illegal and Harmful Activities</h3>
    <ul>
      <li>Use the Service in violation of any applicable federal, Colorado state, or other applicable law or regulation, including securities laws, anti-money-laundering laws, and data protection laws;</li>
      <li>Use the Service to facilitate fraud, market manipulation, wash trading, front-running, or any other illegal trading activity;</li>
      <li>Enter false, fabricated, or misleading trade data for purposes of fraud (e.g., falsifying trading records to deceive investors, lenders, regulators, or tax authorities);</li>
      <li>Use the Service to launder money or in connection with any financial crime;</li>
      <li>Stalk, harass, threaten, or harm any individual.</li>
    </ul>

    <h3>b. Unauthorized Access and Security Violations</h3>
    <ul>
      <li>Attempt to gain unauthorized access to any part of the Service, our servers, databases, or any connected systems;</li>
      <li>Conduct any penetration testing, vulnerability scanning, or security research on the Service without our prior written authorization;</li>
      <li>Introduce, upload, or transmit malware, viruses, Trojan horses, ransomware, spyware, or any other malicious code;</li>
      <li>Attempt to intercept, monitor, or tamper with another user's data or communications;</li>
      <li>Bypass, circumvent, or otherwise defeat any authentication mechanism, access control, or security feature of the Service.</li>
    </ul>

    <h3>c. Intellectual Property Violations</h3>
    <ul>
      <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of any component of the Service;</li>
      <li>Copy, reproduce, modify, or create derivative works of any part of the Service's codebase, user interface, or proprietary content;</li>
      <li>Remove or alter any copyright, trademark, or other proprietary notice embedded in the Service;</li>
      <li>Upload or transmit content that infringes any third-party patent, copyright, trademark, trade secret, or other intellectual property right.</li>
    </ul>

    <h3>d. Subscription and Access Abuse</h3>
    <ul>
      <li>Share, sell, sublicense, or otherwise transfer your account credentials or access to the Service to any third party;</li>
      <li>Create multiple accounts to circumvent subscription limits, free trial restrictions, or account suspension;</li>
      <li>Use the Service to build a competing product, resell access, or commercially exploit the Service beyond what is expressly authorized by your subscription plan.</li>
    </ul>

    <h3>e. Automated and Scraping Activities</h3>
    <ul>
      <li>Use any robot, spider, crawler, scraper, or other automated tool to access, extract, or index content from the Service beyond what is enabled by any official export feature;</li>
      <li>Send automated API requests at a volume or rate that places an unreasonable burden on the Service's infrastructure;</li>
      <li>Attempt to access any API endpoint, database query, or server resource that is not part of the documented public interface of the Service.</li>
    </ul>

    <h3>f. Content Standards</h3>
    <ul>
      <li>Upload trade images or profile avatars containing illegal content, sexually explicit material, hate speech, or content that violates any third party's rights;</li>
      <li>Use the notes, strategy tags, or any text field in the Service to store, communicate, or distribute illegal, defamatory, or harmful content;</li>
      <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</li>
    </ul>

    <h3>g. Minors</h3>
    <ul>
      <li>Allow any person under 18 years of age to access or use your account.</li>
    </ul>

    <h2>3. Your Responsibility for Account Security</h2>
    <p>
      You are solely responsible for all activity that occurs under your account, whether or not authorized by you. You must:
    </p>
    <ul>
      <li>Use a strong, unique password for your Trade Journal Pro account;</li>
      <li>Not share your password or authentication tokens with any third party;</li>
      <li>Promptly notify us at <strong>[CONTACT EMAIL]</strong> if you discover or suspect any unauthorized access to or use of your account;</li>
      <li>Log out of your account when using shared or public devices.</li>
    </ul>

    <h2>4. Accuracy of Trade Data</h2>
    <p>
      You are solely responsible for the accuracy and completeness of the trade data, notes, and other content you enter into the Service. The Service does not independently verify your entries. Entering inaccurate trade data (whether intentional or inadvertent) may produce misleading analytics results, for which [COMPANY LEGAL NAME] is not responsible.
    </p>
    <p>
      You must not enter data that is intended to misrepresent your trading performance for any improper purpose, including misrepresentation to investors, lenders, tax authorities, or prop trading firms.
    </p>

    <h2>5. Third-Party Broker Integrations</h2>
    <p>
      If you connect a broker account to the Service, you represent and warrant that:
    </p>
    <ul>
      <li>You are the authorized account holder of that broker account;</li>
      <li>You are authorized by your broker to grant the Service read access to your trade history;</li>
      <li>Your use of the broker integration complies with your broker's own terms of service;</li>
      <li>You will not use the broker integration in a way that violates any applicable securities regulation.</li>
    </ul>

    <h2>6. Enforcement</h2>
    <p>
      Violation of this AUP may result in, at our sole discretion and without prior notice:
    </p>
    <ul>
      <li>Temporary suspension of your account;</li>
      <li>Permanent termination of your account and subscription, <strong>with no refund</strong>;</li>
      <li>Removal of any content that violates this AUP;</li>
      <li>Reporting of illegal activity to law enforcement or regulatory authorities;</li>
      <li>Civil or criminal legal action against you.</li>
    </ul>
    <p>
      We reserve the right — but are not obligated — to monitor the Service for AUP violations. Our decision to take action (or not) with respect to any particular violation shall not be construed as a waiver of our right to enforce this AUP in other instances.
    </p>

    <h2>7. Reporting Violations</h2>
    <p>
      If you become aware of any use of the Service that violates this AUP, please report it to us at:
    </p>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL]</li>
      <li><strong>Subject line:</strong> AUP Violation Report</li>
    </ul>
    <p>We take all reports seriously and will investigate promptly.</p>

    <h2>8. Amendments</h2>
    <p>
      We reserve the right to update this AUP at any time. We will notify you of material changes by email or in-app notice. Continued use of the Service after an updated AUP takes effect constitutes acceptance. See our <Link to="/terms">Terms of Service</Link> for more detail on how changes to policies are communicated.
    </p>

    <h2>9. Contact</h2>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL]</li>
      <li><strong>Company:</strong> [COMPANY LEGAL NAME]</li>
      <li><strong>Address:</strong> [PRINCIPAL ADDRESS]</li>
    </ul>
  </LegalPageWrapper>
);

export default AcceptableUsePolicy;
