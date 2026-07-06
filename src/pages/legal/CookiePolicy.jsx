import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const CookiePolicy = () => (
  <LegalPageWrapper
    title="Cookie Policy"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="cookies"
  >
    <p>
      This Cookie Policy explains how <strong>[COMPANY LEGAL NAME]</strong> ("Company," "we," "us," or "our") uses cookies and similar browser storage technologies on ZalorTrade (the "Service"). It should be read alongside our <Link to="/privacy">Privacy Policy</Link>.
    </p>

    <h2>1. What Are Cookies?</h2>
    <p>
      Cookies are small text files placed on your device by a website when you visit it. They are widely used to make websites function correctly, improve user experience, and — in some cases — to track users across websites for advertising purposes.
    </p>
    <p>
      Cookies can be "session cookies" (deleted when you close your browser) or "persistent cookies" (remain on your device until they expire or you delete them). They can be set by the website you are visiting ("first-party cookies") or by third-party services embedded in the page ("third-party cookies").
    </p>

    <h2>2. Cookies We Use</h2>
    <p>ZalorTrade uses only <strong>strictly necessary</strong> first-party cookies. We do not use analytics, advertising, or social media tracking cookies of any kind.</p>

    <h3>Strictly Necessary Cookies (Authentication Session)</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Cookie Name</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Purpose</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Type</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2 border border-gray-300 dark:border-gray-600 font-mono text-xs"><code>sb-[project-ref]-auth-token</code></td>
            <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">Stores your authenticated session token, enabling you to stay logged in to ZalorTrade. Set by Supabase Auth. Required for the Service to function.</td>
            <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">Strictly Necessary, First-Party</td>
            <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">Persistent (expires with session or upon explicit sign-out)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p className="mt-3">
      <strong>No consent is required</strong> for strictly necessary cookies under applicable law, including GDPR Recital 25 and the Colorado Privacy Act. These cookies are essential to provide the Service and cannot be disabled without preventing you from logging in.
    </p>

    <h2>3. Local Storage (Not Cookies)</h2>
    <p>
      In addition to cookies, ZalorTrade uses your browser's <code>localStorage</code> to remember certain non-sensitive preferences between sessions. localStorage data is stored entirely on your device and is not transmitted to our servers with every request. It is not a cookie.
    </p>

    <h3>What We Store in Local Storage</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Key</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Contents</th>
            <th className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["selectedBroker", "Name of the broker you last selected", "Remember your broker selection between page loads"],
            ["brokerConfig", "Non-sensitive broker connection settings (no tokens, no credentials)", "Restore broker configuration panel state"],
            ["propFirm", "Name of the prop firm selected (if any)", "Remember your prop firm preference"],
            ["isConnected", "Boolean — whether you have a connected broker", "Restore UI connection state"],
            ["accounts", "List of trading account names (no account numbers or balances)", "Restore account selector state"],
            ["selectedAccount", "Currently selected trading account name", "Remember your last-used account"],
            ["autoSync", "Boolean — whether auto-sync is enabled", "Remember your sync preference"],
            ["syncInterval", "Numeric interval for auto-sync (in minutes)", "Remember your sync interval setting"],
          ].map(([key, contents, purpose]) => (
            <tr key={key} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600 font-mono text-xs">{key}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">{contents}</td>
              <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="mt-3">
      <strong>What we do NOT store in local storage:</strong> We never store OAuth access or refresh tokens, passwords, full account numbers, account balances, payment card details, or any other sensitive information in localStorage. These are handled exclusively server-side. This practice is consistent with our security standards described in the <Link to="/privacy">Privacy Policy</Link>.
    </p>

    <h2>4. Third-Party Cookies</h2>
    <p>
      ZalorTrade does <strong>not</strong> embed:
    </p>
    <ul>
      <li>Google Analytics, Google Tag Manager, or any Google tracking code;</li>
      <li>Meta Pixel (Facebook), Twitter/X tracking pixels, or similar social media SDKs;</li>
      <li>Advertising networks or programmatic ad SDKs;</li>
      <li>Session recording tools (Hotjar, FullStory, LogRocket);</li>
      <li>A/B testing SDKs (Optimizely, VWO); or</li>
      <li>Any other third-party script that sets cookies on this domain.</li>
    </ul>
    <p>
      As a result, no third-party cookies are set when you use ZalorTrade.
    </p>

    <h2>5. Managing and Deleting Cookies</h2>
    <p>
      You can control cookies through your browser settings. Here are links to cookie management instructions for common browsers:
    </p>
    <ul>
      <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
      <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
      <li><strong>Apple Safari:</strong> Preferences → Privacy → Manage Website Data</li>
      <li><strong>Microsoft Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
    </ul>
    <p>
      <strong>Please note:</strong> Blocking or deleting the authentication cookie (<code>sb-*-auth-token</code>) will prevent you from logging in to ZalorTrade. This is a strictly necessary cookie and the Service cannot function without it.
    </p>
    <p>
      To clear localStorage data, you can use your browser's developer tools (Application → Local Storage → Clear).
    </p>

    <h2>6. Changes to This Cookie Policy</h2>
    <p>
      We may update this Cookie Policy if we introduce new features that use cookies or storage technologies. We will notify you via email or in-app notice before any material changes take effect.
    </p>

    <h2>7. Contact</h2>
    <p>Questions about our use of cookies? Contact us:</p>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL]</li>
      <li><strong>Company:</strong> [COMPANY LEGAL NAME]</li>
      <li><strong>Address:</strong> [PRINCIPAL ADDRESS]</li>
    </ul>
  </LegalPageWrapper>
);

export default CookiePolicy;
