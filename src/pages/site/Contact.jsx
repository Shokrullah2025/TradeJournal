import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Mail, MessageSquare, Clock, Send } from "lucide-react";
import { contactSchema } from "../../lib/schemas/contact";
import { supabase } from "../../lib/supabase";
import TurnstileWidget from "../../components/site/TurnstileWidget";

// Public Turnstile site key (safe to expose — verified server-side). When unset
// (e.g. local dev), the captcha is skipped entirely. (CLAUDE.md §2)
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * Contact page (route "/contact"). Public form validated with Zod, protected by
 * a Cloudflare Turnstile CAPTCHA, and submitted to the `contact-submit` Edge
 * Function which verifies the captcha, persists to `contact_submissions`, and
 * emails the team. Shows a success/error toast and resets on success.
 */
const Contact = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  // Captcha token + a key we bump to remount the widget for a fresh challenge.
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const handleVerify = useCallback((token) => setCaptchaToken(token), []);
  const handleExpire = useCallback(() => setCaptchaToken(""), []);

  const onSubmit = async (values) => {
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Please complete the captcha to continue.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("contact-submit", {
        body: { ...values, captchaToken },
      });
      if (error || !data?.success) {
        throw new Error(error?.message ?? "send_failed");
      }
      toast.success("Thanks! Your message has been sent. We'll be in touch.");
      reset();
      setCaptchaToken("");
      setCaptchaKey((k) => k + 1); // remount widget → fresh challenge
    } catch {
      toast.error("Something went wrong. Please try again.");
      setCaptchaToken("");
      setCaptchaKey((k) => k + 1);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email us",
      detail: "support@tradejournalpro.app",
    },
    {
      icon: MessageSquare,
      title: "Questions about pricing?",
      detail: "Check the pricing FAQ",
    },
    {
      icon: Clock,
      title: "Response time",
      detail: "We usually reply within one business day.",
    },
  ];

  return (
    <div data-testid="site-contact-page">
      {/* Header */}
      <section className="bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            Get in <span className="text-gradient">touch</span>
          </h1>
          <p className="mx-auto mt-6 text-lg text-gray-600 dark:text-gray-400">
            Questions, feedback, or partnership ideas? Send us a note and we'll
            get back to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Info column */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Talk to us
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              The fastest way to reach the team is the form — but here's where
              else you can find us.
            </p>
            <ul className="mt-8 space-y-6">
              {contactInfo.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
              Looking for answers now? Visit our{" "}
              <Link
                to="/pricing"
                data-testid="contact-faq-link"
                className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                pricing FAQ
              </Link>
              .
            </p>
          </div>

          {/* Form column */}
          <div className="lg:col-span-3">
            <form
              data-testid="contact-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="label">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    data-testid="contact-name-input"
                    className="input"
                    placeholder="Jane Trader"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p
                      data-testid="contact-name-error"
                      className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                    >
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="label">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    data-testid="contact-email-input"
                    className="input"
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p
                      data-testid="contact-email-error"
                      className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="contact-subject" className="label">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  data-testid="contact-subject-input"
                  className="input"
                  placeholder="How can we help?"
                  {...register("subject")}
                />
                {errors.subject && (
                  <p
                    data-testid="contact-subject-error"
                    className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                  >
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label htmlFor="contact-message" className="label">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  data-testid="contact-message-input"
                  className="textarea"
                  placeholder="Tell us a bit more…"
                  {...register("message")}
                />
                {errors.message && (
                  <p
                    data-testid="contact-message-error"
                    className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                  >
                    {errors.message.message}
                  </p>
                )}
              </div>

              <TurnstileWidget
                key={captchaKey}
                siteKey={TURNSTILE_SITE_KEY}
                onVerify={handleVerify}
                onExpire={handleExpire}
              />

              <button
                type="submit"
                data-testid="contact-submit-btn"
                disabled={isSubmitting}
                className="btn btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending…" : "Send message"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
