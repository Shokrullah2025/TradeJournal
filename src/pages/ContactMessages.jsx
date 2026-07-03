import React, { useState, useEffect, useCallback } from "react";
import ModalPortal from "../components/common/ModalPortal";
import {
  Mail,
  Inbox,
  Archive,
  ShieldAlert,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { contactReplySchema } from "../lib/schemas/contact";
import { useContactInbox } from "../context/ContactInboxContext";
import { toast } from "react-hot-toast";

const PAGE_SIZE = 50;

// Explicit column list — never select('*') (CLAUDE.md §4).
const COLUMNS = "id, name, email, subject, message, status, metadata, created_at";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
  { value: "spam", label: "Spam" },
];

const STATUS_BADGE = {
  new: "bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300",
  read: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  archived: "bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300",
  spam: "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300",
};

/**
 * Admin inbox for public Contact form submissions (route "/admin/contact-submissions").
 * Reads from contact_submissions (admins are allowed by the RLS policy in
 * migration 022) with pagination, and lets admins triage status.
 */
const ContactMessages = () => {
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  // Keeps the sidebar's aggregated unread badge instantly in sync when we triage
  // here (realtime also refreshes it, but this makes the change immediate).
  const { refresh: refreshContactBadge } = useContactInbox();

  const load = useCallback(async () => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("contact_submissions")
      .select(COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, error: queryError, count } = await query;
    if (queryError) throw new Error(queryError.message);
    return { data: data ?? [], count: count ?? 0 };
  }, [page, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    load()
      .then(({ data, count }) => {
        if (cancelled) return;
        setSubmissions(data);
        setTotal(count);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[ContactMessages] load error:", err.message);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const updateStatus = async (id, status) => {
    try {
      const { error: updateError } = await supabase
        .from("contact_submissions")
        .update({ status })
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
      setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
      refreshContactBadge();
      toast.success(`Marked as ${status}.`);
    } catch (err) {
      console.error("[ContactMessages] update error:", err.message);
      toast.error("Couldn't update the message. Please try again.");
    }
  };

  const openMessage = (submission) => {
    setSelected(submission);
    setReplyText("");
    if (submission.status === "new") updateStatus(submission.id, "read");
  };

  // Send an in-app reply: emails the submitter from the support address via the
  // contact-reply Edge Function. No mail client involved (CLAUDE.md §2 — identity
  // and admin check are enforced server-side).
  const sendReply = async () => {
    if (!selected) return;
    const parsed = contactReplySchema.safeParse({
      submissionId: selected.id,
      message: replyText,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please enter a reply.");
      return;
    }

    setSendingReply(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "contact-reply",
        { body: parsed.data },
      );

      // A non-2xx response comes back as fnError (FunctionsHttpError) with the
      // real message in error.context — surface it so failures are diagnosable
      // (e.g. "Email sending isn't configured yet") instead of a generic toast.
      if (fnError) {
        let serverMessage = fnError.message;
        try {
          const errBody = await fnError.context?.json?.();
          if (errBody?.error) serverMessage = errBody.error;
        } catch {
          // response body wasn't JSON (e.g. function not deployed → 404 HTML)
        }
        throw new Error(serverMessage);
      }
      if (!data?.success) throw new Error(data?.error ?? "send_failed");

      toast.success("Reply sent.");
      const sentReply = { at: new Date().toISOString(), message: parsed.data.message };
      setReplyText("");
      // The function marks the submission read and appends the reply to
      // metadata.replies; mirror both locally so the thread shows immediately and
      // survives reopening the message without a reload.
      const appendReply = (s) => ({
        ...s,
        status: "read",
        metadata: {
          ...(s.metadata ?? {}),
          replies: [...(s.metadata?.replies ?? []), sentReply],
        },
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selected.id ? appendReply(s) : s)),
      );
      setSelected((prev) => (prev ? appendReply(prev) : prev));
    } catch (err) {
      console.error("[ContactMessages] reply error:", err.message);
      toast.error(
        err.message && err.message !== "send_failed"
          ? err.message
          : "Couldn't send the reply. Please try again.",
      );
    } finally {
      setSendingReply(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6" data-testid="admin-contact-page">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Contact Submissions
        </h1>
        <span
          data-testid="admin-contact-count"
          className="ml-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {total}
        </span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            data-testid={`admin-contact-filter-${f.value}`}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-primary-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Received
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  data-testid="admin-contact-loading"
                  className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={5}
                  data-testid="admin-contact-error"
                  className="px-6 py-10 text-center text-sm text-danger-600 dark:text-danger-400"
                >
                  Couldn't load submissions. Please refresh and try again.
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  data-testid="admin-contact-empty"
                  className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                  No submissions yet.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr
                  key={s.id}
                  data-testid={`admin-contact-row-${s.id}`}
                  onClick={() => openMessage(s)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {s.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {s.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{s.subject}</span>
                      {s.metadata?.replies?.length > 0 && (
                        <span
                          data-testid={`admin-contact-replied-${s.id}`}
                          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-success-100 dark:bg-success-900/30 px-2 py-0.5 text-[11px] font-medium text-success-700 dark:text-success-300"
                        >
                          <CheckCircle className="h-3 w-3" /> Replied
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      data-testid={`admin-contact-status-${s.id}`}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        STATUS_BADGE[s.status] ?? STATUS_BADGE.read
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      data-testid={`admin-contact-view-btn-${s.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openMessage(s);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                data-testid="admin-contact-prev-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                data-testid="admin-contact-next-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message detail modal */}
      {selected && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            data-testid="admin-contact-detail-modal"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selected.name} &lt;{selected.email}&gt;
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button
                data-testid="admin-contact-modal-close-btn"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-800 dark:text-gray-200">
              {selected.message}
            </div>

            {/* Reply thread — the support replies sent for this message are kept
                here so the whole conversation stays with the original email. */}
            {selected.metadata?.replies?.length > 0 && (
              <div
                data-testid="admin-contact-thread"
                className="mt-4 space-y-3"
              >
                {selected.metadata.replies.map((r, i) => (
                  <div
                    key={i}
                    data-testid={`admin-contact-thread-reply-${i}`}
                    className="rounded-lg border border-primary-200 dark:border-primary-900/40 bg-primary-50/60 dark:bg-primary-900/10 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                        You replied
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {new Date(r.at).toLocaleString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {r.message}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply composer — emails the customer from support@ via the
                contact-reply Edge Function. No mail client, no personal email. */}
            <div className="mt-6">
              <label htmlFor="admin-contact-reply" className="label">
                Reply to {selected.name}
              </label>
              <textarea
                id="admin-contact-reply"
                data-testid="admin-contact-reply-input"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Write a reply — it'll be emailed to ${selected.email} from support.`}
                className="textarea mt-1"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Sent from support@tradgella.com — the customer can reply directly
                to that address.
              </p>
              <button
                type="button"
                data-testid="admin-contact-send-reply-btn"
                onClick={sendReply}
                disabled={sendingReply || replyText.trim().length === 0}
                className="btn btn-primary mt-3 inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sendingReply ? "Sending…" : "Send reply"}
              </button>
            </div>

            {/* Triage */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                data-testid="admin-contact-mark-read-btn"
                onClick={() => updateStatus(selected.id, "read")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <CheckCircle className="h-4 w-4" /> Mark read
              </button>
              <button
                data-testid="admin-contact-archive-btn"
                onClick={() => updateStatus(selected.id, "archived")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
              <button
                data-testid="admin-contact-spam-btn"
                onClick={() => updateStatus(selected.id, "spam")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 dark:border-danger-900/50 px-3 py-1.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
              >
                <ShieldAlert className="h-4 w-4" /> Spam
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ContactMessages;
