import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

/**
 * Cloudflare Turnstile CAPTCHA widget (explicit-render mode).
 *
 * Renders the challenge and surfaces its token via onVerify. The token is later
 * verified server-side in the `contact-submit` Edge Function — the widget alone
 * proves nothing. Renders nothing when no site key is configured, so local/dev
 * environments without Turnstile keys keep working.
 *
 * Reset by changing the component's `key` from the parent (forces a remount and
 * a fresh challenge after a successful submit).
 */
const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function ensureScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

const TurnstileWidget = ({ siteKey, theme, onVerify, onExpire }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!siteKey) return undefined;

    let widgetId = null;
    ensureScript();

    // The script loads asynchronously; poll until window.turnstile is ready,
    // then render once into our container.
    const interval = setInterval(() => {
      if (!window.turnstile || !containerRef.current || widgetId !== null) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme ?? "auto",
        callback: (token) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onExpire?.(),
      });
    }, 200);

    return () => {
      clearInterval(interval);
      if (widgetId !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // widget already gone — nothing to clean up
        }
      }
    };
  }, [siteKey, theme, onVerify, onExpire]);

  if (!siteKey) return null;

  return <div ref={containerRef} data-test-id="contact-captcha" className="mt-5" />;
};

TurnstileWidget.propTypes = {
  siteKey: PropTypes.string,
  theme: PropTypes.oneOf(["auto", "light", "dark"]),
  onVerify: PropTypes.func.isRequired,
  onExpire: PropTypes.func,
};

export default TurnstileWidget;
