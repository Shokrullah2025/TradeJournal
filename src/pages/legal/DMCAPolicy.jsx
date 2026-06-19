import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const DMCAPolicy = () => (
  <LegalPageWrapper
    title="DMCA & Copyright Policy"
    effectiveDate="June 18, 2026"
    lastUpdated="June 18, 2026"
    slug="dmca"
  >
    <p>
      This DMCA & Copyright Policy describes how <strong>[COMPANY LEGAL NAME]</strong>, a Colorado limited liability company ("Company," "we," "us," or "our"), handles claims of copyright infringement in connection with Trade Journal Pro (the "Service"), and explains your rights and obligations under the Digital Millennium Copyright Act, 17 U.S.C. § 512 (the "DMCA").
    </p>
    <p>
      We respect intellectual property rights and expect our users to do the same. This policy is incorporated into our <Link to="/terms">Terms of Service</Link>.
    </p>

    <h2>1. Designated Copyright Agent</h2>
    <p>
      Pursuant to 17 U.S.C. § 512(c)(2), we have designated a Copyright Agent to receive notifications of claimed copyright infringement. Our designated agent is:
    </p>
    <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-5 py-4 my-4">
      <p><strong>Copyright Agent</strong></p>
      <p>[COMPANY LEGAL NAME]</p>
      <p>Attn: DMCA Copyright Agent</p>
      <p>[PRINCIPAL ADDRESS]</p>
      <p>Email: [CONTACT EMAIL] (subject line: DMCA Takedown Notice)</p>
    </div>
    <p>
      Only DMCA notices should be sent to this address. Other correspondence will not receive a response.
    </p>

    <h2>2. User-Uploaded Content on the Service</h2>
    <p>
      The primary type of user-generated content that Trade Journal Pro hosts is:
    </p>
    <ul>
      <li><strong>Trade screenshot images</strong> — chart screenshots and trade analysis images uploaded by users to illustrate their trades (stored in Supabase Storage, trade-images bucket); and</li>
      <li><strong>Profile avatar images</strong> — profile pictures uploaded by users (stored in Supabase Storage, avatars bucket).</li>
    </ul>
    <p>
      All user-uploaded content is private by default and accessible only to the uploading user. If you believe a user has uploaded content that infringes your copyright, you may submit a takedown notice as described below.
    </p>

    <h2>3. Filing a DMCA Takedown Notice</h2>
    <p>
      If you are a copyright owner or authorized to act on behalf of a copyright owner and you believe that content on the Service infringes your copyright, you may submit a takedown notice to our Copyright Agent. To be effective under 17 U.S.C. § 512(c)(3), your written notice <strong>must include all of the following</strong>:
    </p>
    <ol>
      <li><strong>Signature:</strong> A physical or electronic signature of the copyright owner or a person authorized to act on the copyright owner's behalf;</li>
      <li><strong>Identification of the work:</strong> Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works;</li>
      <li><strong>Identification of the infringing material:</strong> Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material (e.g., a URL, screenshot, or description sufficient to identify the content);</li>
      <li><strong>Contact information:</strong> Your name, address, telephone number, and email address;</li>
      <li><strong>Good faith statement:</strong> A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law; and</li>
      <li><strong>Accuracy statement:</strong> A statement, made under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or are authorized to act on behalf of the copyright owner.</li>
    </ol>
    <p>
      Send your complete takedown notice to our Copyright Agent at <strong>[CONTACT EMAIL]</strong> with the subject line "DMCA Takedown Notice."
    </p>
    <p>
      <strong>Warning:</strong> Filing a materially false DMCA takedown notice may expose you to civil liability under 17 U.S.C. § 512(f), including liability for damages and attorneys' fees.
    </p>

    <h2>4. Our Response to Takedown Notices</h2>
    <p>
      Upon receipt of a complete and valid DMCA takedown notice, we will:
    </p>
    <ul>
      <li>Promptly remove or disable access to the allegedly infringing content;</li>
      <li>Notify the user who uploaded the content that it has been removed pursuant to a DMCA notice; and</li>
      <li>Provide the user with a copy of the takedown notice (with your contact information, unless you request it be withheld from the user for safety reasons).</li>
    </ul>
    <p>
      We will not respond to notices that are incomplete, in bad faith, or do not comply with the requirements of 17 U.S.C. § 512(c)(3).
    </p>

    <h2>5. Counter-Notification Procedure</h2>
    <p>
      If you are a user whose content was removed in response to a DMCA notice and you believe the removal was made in error — for example, because you have authorization to use the content or the content does not infringe any copyright — you may file a counter-notification with our Copyright Agent under 17 U.S.C. § 512(g)(3).
    </p>
    <p>Your counter-notification must include all of the following:</p>
    <ol>
      <li><strong>Signature:</strong> Your physical or electronic signature;</li>
      <li><strong>Identification of removed material:</strong> Identification of the material that was removed and the location where it appeared before removal;</li>
      <li><strong>Statement under penalty of perjury:</strong> A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification;</li>
      <li><strong>Consent to jurisdiction:</strong> Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal district court for the judicial district in which your address is located (or, if outside the U.S., the U.S. District Court for the District of Colorado), and that you will accept service of process from the party that submitted the original takedown notice; and</li>
      <li><strong>Contact information:</strong> Your current email address.</li>
    </ol>
    <p>
      Send your counter-notification to our Copyright Agent at <strong>[CONTACT EMAIL]</strong> with the subject line "DMCA Counter-Notification."
    </p>
    <p>
      Upon receipt of a valid counter-notification, we will forward it to the original complainant and inform them that we may restore the removed content within <strong>10–14 business days</strong> unless the complainant notifies us that they have filed an action seeking a court order to restrain you from engaging in the infringing activity. If no such court order is received, we will restore the removed content.
    </p>

    <h2>6. Repeat Infringer Policy</h2>
    <p>
      In accordance with 17 U.S.C. § 512(i), we have adopted a policy of terminating the accounts of users who are repeat copyright infringers. An account may be terminated if we receive multiple valid DMCA takedown notices regarding content uploaded by that user. We evaluate each situation on its specific facts. Termination of an account for repeat infringement is at our sole discretion and is not subject to appeal.
    </p>
    <p>
      Terminated accounts are not entitled to any refund. See our <Link to="/refund">Refund & Billing Policy</Link>.
    </p>

    <h2>7. Our Own Copyright and Intellectual Property</h2>
    <p>
      All software code, user interface designs, icons, logos, trademarks, and other proprietary content of Trade Journal Pro are owned by [COMPANY LEGAL NAME] and are protected by U.S. copyright law (17 U.S.C. § 102 et seq.), trademark law, and other applicable intellectual property laws.
    </p>
    <p>
      You may not copy, reproduce, distribute, create derivative works from, or publicly display any portion of the Service's codebase, design, or brand elements without our prior written consent. Unauthorized use of our copyrighted material may result in civil and criminal liability under applicable law.
    </p>

    <h2>8. Trademarks</h2>
    <p>
      "Trade Journal Pro" and any associated logos are trademarks or service marks of [COMPANY LEGAL NAME]. Nothing in these terms or this policy grants you any right to use our trademarks, trade names, or service marks without our prior written approval. All other trademarks mentioned on the Service are the property of their respective owners.
    </p>

    <h2>9. Contact</h2>
    <p>For all DMCA and copyright matters:</p>
    <ul>
      <li><strong>Email:</strong> [CONTACT EMAIL] (subject: DMCA Notice)</li>
      <li><strong>Mail:</strong> [COMPANY LEGAL NAME], Attn: DMCA Copyright Agent, [PRINCIPAL ADDRESS]</li>
    </ul>
  </LegalPageWrapper>
);

export default DMCAPolicy;
