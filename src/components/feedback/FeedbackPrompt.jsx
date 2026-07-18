import React, { useEffect, useRef, useState } from "react";
import { Star, X, MessageSquareHeart } from "lucide-react";
import { toast } from "react-hot-toast";
import ModalPortal from "../common/ModalPortal";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useFeatureFlags } from "../../context/FeatureFlagContext";

// ── 30-minute in-app feedback prompt ────────────────────────────────────────
// After a user has spent ~30 minutes in the app we ask, once, what they think
// of it: a 1–5 star rating plus an optional comment, written to trial_feedback
// with source 'app_prompt'. It is deliberately low-friction and never nags:
//   • shown only to real users (trial/paid) — never to a "free" user sitting
//     behind the TrialGate, and never to admins (staff, not customers);
//   • at most once per user — the trial_feedback UNIQUE(user_id) index and a
//     pre-check both guarantee a single row, so a user who already gave any
//     feedback never sees it;
//   • "Not now" snoozes it for a day; submitting retires it for good.
//
// The 30-minute clock is wall-clock from the first app load in this browser
// (persisted), so it also fires shortly after a user who was already past the
// threshold closes the browser and comes back — matching "after they use it
// for a while", not "30 minutes of a single unbroken session".

const DELAY_MS = 30 * 60 * 1000; // 30 minutes
const SNOOZE_MS = 24 * 60 * 60 * 1000; // "Not now" → ask again tomorrow

// Non-sensitive local flags only (no tokens, PII, or trade data — CLAUDE.md §1):
// a first-seen timestamp, a snooze deadline, and a "handled" flag.
const LS_FIRST_SEEN = "zt_feedback_t0";
const LS_SNOOZE_UNTIL = "zt_feedback_snooze_until";
const LS_DONE = "zt_feedback_done";

const readNum = (key) => {
  const n = Number(localStorage.getItem(key) || 0);
  return Number.isFinite(n) ? n : 0;
};

const REASONS = [
  { value: "", label: "General feedback" },
  { value: "missing_features", label: "Something's missing" },
  { value: "too_complex", label: "Hard to use" },
  { value: "too_expensive", label: "Pricing" },
  { value: "other", label: "Other" },
];

const AUDIENCES_ELIGIBLE = ["trial", "basic", "premium", "enterprise"];

const FeedbackPrompt = () => {
  const { user } = useAuth();
  const { audience } = useFeatureFlags();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const eligible = Boolean(user) && AUDIENCES_ELIGIBLE.includes(audience);

  useEffect(() => {
    if (!eligible) return undefined;
    if (localStorage.getItem(LS_DONE) === "1") return undefined;

    let cancelled = false;

    const schedule = () => {
      const now = Date.now();
      const snoozeUntil = readNum(LS_SNOOZE_UNTIL);

      let t0 = readNum(LS_FIRST_SEEN);
      if (!t0) {
        t0 = now;
        localStorage.setItem(LS_FIRST_SEEN, String(t0));
      }

      // Show once BOTH the 30-minute mark and any active snooze have passed.
      const dueAt = Math.max(t0 + DELAY_MS, snoozeUntil);
      const delay = Math.max(0, dueAt - now);

      timerRef.current = setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, delay);
    };

    // Gate on whether this user has already left feedback (any source). RLS
    // scopes the read to their own rows. Fails open: a read hiccup shouldn't
    // strand the prompt, but we also never double-insert thanks to the UNIQUE
    // index + the 23505 handling on submit.
    (async () => {
      try {
        const { data } = await supabase
          .from("trial_feedback")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          localStorage.setItem(LS_DONE, "1");
          return;
        }
      } catch {
        if (cancelled) return;
      }
      schedule();
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [eligible, user]);

  const snooze = () => {
    localStorage.setItem(LS_SNOOZE_UNTIL, String(Date.now() + SNOOZE_MS));
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("trial_feedback").insert({
        user_id: user.id,
        rating,
        reason: reason || null,
        comment: comment.trim() || null,
        source: "app_prompt",
      });
      // 23505 = the UNIQUE(user_id) guard already has a row for this user;
      // treat as done rather than an error.
      if (error && error.code !== "23505") throw error;
      localStorage.setItem(LS_DONE, "1");
      setOpen(false);
      toast.success("Thanks for the feedback! 🙏");
    } catch (err) {
      console.error("[Feedback] submit error:", err?.message);
      toast.error("Couldn't send that just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 px-4"
        onClick={snooze}
        data-test-id="feedback-prompt-backdrop"
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-prompt-title"
          data-test-id="feedback-prompt"
        >
          <button
            type="button"
            onClick={snooze}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
            data-test-id="feedback-prompt-close-btn"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <MessageSquareHeart className="h-6 w-6" />
          </div>

          <h3
            id="feedback-prompt-title"
            className="text-lg font-bold text-gray-900 dark:text-gray-100"
          >
            How's it going so far?
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You've been using ZalorTrade for a bit — we'd love to hear what you
            think. It takes ten seconds.
          </p>

          {/* Star rating */}
          <div
            className="mt-5 flex items-center gap-1.5"
            data-test-id="feedback-prompt-stars"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                data-test-id={`feedback-prompt-star-${n}`}
                className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Star
                  className={`h-8 w-8 ${
                    (hover || rating) >= n
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Topic (optional) */}
          <label className="mt-5 block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              What's this about? (optional)
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-test-id="feedback-prompt-reason-select"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {REASONS.map((r) => (
                <option key={r.value || "general"} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {/* Comment (optional) */}
          <label className="mt-4 block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Anything you'd like to add? (optional)
            </span>
            <textarea
              rows={3}
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's working, what's missing, what you'd change…"
              data-test-id="feedback-prompt-comment-input"
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={snooze}
              disabled={submitting}
              className="rounded-[10px] border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              data-test-id="feedback-prompt-dismiss-btn"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-[10px] bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-70 dark:bg-teal-700 dark:hover:bg-teal-600"
              data-test-id="feedback-prompt-submit-btn"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending…
                </>
              ) : (
                "Send feedback"
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FeedbackPrompt;
