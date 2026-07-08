import React, { useState, useEffect, useCallback, useMemo } from "react";
import ModalPortal from "../components/common/ModalPortal";
import {
  Mail,
  Inbox,
  Archive,
  ShieldAlert,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Send,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { useContactInboxCount } from "../hooks/useContactInboxCount";
import { contactReplySchema } from "../lib/schemas/contact";

const PAGE_SIZE = 50;

// Explicit column lists — never select('*') (CLAUDE.md §4).
// Thread rows come from the contact_threads view (migration 034): one row per
// sender email carrying the latest message plus per-thread counts.
const THREAD_COLUMNS =
  "email, latest_id, latest_name, latest_subject, latest_message, latest_status, last_message_at, message_count, new_count";
// Individual messages inside an open thread. metadata carries the admin reply
// history ({ replies: [{ at, by, message }] }) written by contact-reply.
const MESSAGE_COLUMNS =
  "id, name, email, subject, message, status, metadata, created_at";

// Safety cap when loading a thread's history — a single sender should never
// have anywhere near this many messages (rate limit is 5/hour).
const THREAD_MESSAGE_LIMIT = 200;

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
 * Thread-based: the list shows one row per sender email (from the
 * contact_threads view), ordered by most recent message, so a new email from
 * an existing sender bumps their conversation to the top. Opening a row loads
 * the full history for that sender (newest first) and marks it read. Reads are
 * allowed by the admin RLS policy from migration 024; realtime refresh comes
 * via useContactInboxCount (publication added in 034).
 */
const ContactMessages = () => {
  const [threads, setThreads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // The open conversation: the thread row plus its loaded messages.
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  // In-app reply composer (sent via the contact-reply Edge Function).
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  // Global unread count — shown on the "New" filter tab and used to trigger a
  // live reload of the list when a new submission arrives.
  const { newCount } = useContactInboxCount();

  const load = useCallback(async () => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("contact_threads")
      .select(THREAD_COLUMNS, { count: "exact" })
      .order("last_message_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (statusFilter === "new") {
      query = query.gt("new_count", 0);
    } else if (statusFilter !== "all") {
      query = query.eq("latest_status", statusFilter);
    }

    const { data, error: queryError, count } = await query;
    if (queryError) throw new Error(queryError.message);
    return { data: data ?? [], count: count ?? 0 };
  }, [page, statusFilter]);

  // newCount is a dependency so an incoming submission (realtime) reloads the
  // list and the fresh conversation appears at the top without a refresh.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    load()
      .then(({ data, count }) => {
        if (cancelled) return;
        setThreads(data);
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
  }, [load, newCount]);

  // Apply a status to every message in a sender's conversation. Threads are
  // triaged as a unit — archiving or flagging spam covers the whole history.
  const updateThreadStatus = async (email, status, { silent = false } = {}) => {
    try {
      let query = supabase.from("contact_submissions").update({ status }).eq("email", email);
      // Marking read only touches unread messages, preserving archived/spam.
      if (status === "read") query = query.eq("status", "new");

      const { error: updateError } = await query;
      if (updateError) throw new Error(updateError.message);

      setThreads((prev) =>
        prev.map((t) =>
          t.email === email
            ? {
                ...t,
                latest_status:
                  status === "read" && t.latest_status !== "new" ? t.latest_status : status,
                new_count: 0,
              }
            : t,
        ),
      );
      setThreadMessages((prev) =>
        prev.map((m) =>
          status === "read" ? (m.status === "new" ? { ...m, status: "read" } : m) : { ...m, status },
        ),
      );
      if (!silent) toast.success(`Conversation marked as ${status}.`);
    } catch (err) {
      console.error("[ContactMessages] update error:", err.message);
      if (!silent) toast.error("Couldn't update the conversation. Please try again.");
    }
  };

  const fetchThreadMessages = useCallback(async (email) => {
    const { data, error: messagesError } = await supabase
      .from("contact_submissions")
      .select(MESSAGE_COLUMNS)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(THREAD_MESSAGE_LIMIT);
    if (messagesError) throw new Error(messagesError.message);
    return data ?? [];
  }, []);

  // Open a conversation: load every message from this sender, newest first,
  // and mark the unread ones as read.
  const openThread = async (thread) => {
    setSelectedThread(thread);
    setThreadMessages([]);
    setReplyText("");
    setThreadLoading(true);
    try {
      setThreadMessages(await fetchThreadMessages(thread.email));
      if (thread.new_count > 0) {
        await updateThreadStatus(thread.email, "read", { silent: true });
      }
    } catch (err) {
      console.error("[ContactMessages] thread load error:", err.message);
      toast.error("Couldn't load the conversation. Please try again.");
      setSelectedThread(null);
    } finally {
      setThreadLoading(false);
    }
  };

  const closeThread = () => {
    setSelectedThread(null);
    setThreadMessages([]);
    setReplyText("");
  };

  // Email the sender from inside the app (contact-reply Edge Function). The
  // reply is attached to the newest message in the thread and shows up in the
  // conversation below once it's recorded.
  const sendReply = async () => {
    const latest = threadMessages[0];
    if (!latest || replySending) return;

    const parsed = contactReplySchema.safeParse({ message: replyText });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setReplySending(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "contact-reply",
        { body: { submissionId: latest.id, message: parsed.data.message } },
      );
      if (invokeError || data?.success === false) {
        throw new Error(data?.error ?? invokeError.message);
      }
      setReplyText("");
      toast.success("Reply sent.");
      // Reload the history so the new reply appears in the conversation.
      setThreadMessages(await fetchThreadMessages(latest.email));
    } catch (err) {
      console.error("[ContactMessages] reply error:", err.message);
      toast.error("Couldn't send the reply. Please try again.");
    } finally {
      setReplySending(false);
    }
  };

  // Flatten visitor messages and admin replies into one conversation, newest
  // first — so the latest email (or reply) always sits at the top.
  const conversation = useMemo(() => {
    const entries = [];
    for (const m of threadMessages) {
      entries.push({
        kind: "visitor",
        key: m.id,
        subject: m.subject,
        message: m.message,
        at: m.created_at,
      });
      const replies = Array.isArray(m.metadata?.replies) ? m.metadata.replies : [];
      replies.forEach((r, i) => {
        entries.push({
          kind: "admin",
          key: `${m.id}-reply-${i}`,
          subject: `Re: ${m.subject}`,
          message: r.message,
          at: r.at,
          by: r.by,
        });
      });
    }
    return entries.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [threadMessages]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const latestMessage = threadMessages[0] ?? null;
  // Prefer the freshly loaded conversation length (emails + replies); fall
  // back to the list row's email count while the thread is still loading.
  const threadCount = threadLoading
    ? selectedThread?.message_count ?? 0
    : conversation.length;

  return (
    <div className="space-y-6" data-testid="admin-contact-page">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Contact Inbox
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-primary-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
            {f.value === "new" && newCount > 0 && (
              <span
                data-testid="admin-contact-new-tab-badge"
                className={`min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                  statusFilter === "new"
                    ? "bg-white/25 text-white"
                    : "bg-danger-500 text-white"
                }`}
              >
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
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
                Latest Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Received
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
                  colSpan={6}
                  data-testid="admin-contact-loading"
                  className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={6}
                  data-testid="admin-contact-error"
                  className="px-6 py-10 text-center text-sm text-danger-600 dark:text-danger-400"
                >
                  Couldn't load conversations. Please refresh and try again.
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  data-testid="admin-contact-empty"
                  className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                  No conversations yet.
                </td>
              </tr>
            ) : (
              threads.map((t) => (
                <tr
                  key={t.email}
                  data-testid={`admin-contact-row-${t.latest_id}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm text-gray-900 dark:text-gray-100 ${
                        t.new_count > 0 ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {t.latest_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                    {t.latest_subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      data-testid={`admin-contact-thread-count-${t.latest_id}`}
                      className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <MessagesSquare className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      {t.message_count}
                    </span>
                    {t.new_count > 0 && (
                      <span
                        data-testid={`admin-contact-thread-new-badge-${t.latest_id}`}
                        className="ml-2 inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full bg-danger-500 text-[11px] font-semibold text-white"
                      >
                        {t.new_count > 99 ? "99+" : t.new_count}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(t.last_message_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      data-testid={`admin-contact-status-${t.latest_id}`}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        STATUS_BADGE[t.new_count > 0 ? "new" : t.latest_status] ??
                        STATUS_BADGE.read
                      }`}
                    >
                      {t.new_count > 0 ? "new" : t.latest_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      data-testid={`admin-contact-view-btn-${t.latest_id}`}
                      onClick={() => openThread(t)}
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

      {/* Conversation detail modal — every message from this sender, newest first */}
      {selectedThread && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={closeThread}
        >
          <div
            data-testid="admin-contact-detail-modal"
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedThread.latest_name} &lt;{selectedThread.email}&gt;
                </h2>
                <p
                  data-testid="admin-contact-thread-message-count"
                  className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  {threadCount} {threadCount === 1 ? "message" : "messages"} — newest first
                </p>
              </div>
              <button
                data-testid="admin-contact-modal-close-btn"
                onClick={closeThread}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto">
              {threadLoading ? (
                <div
                  data-testid="admin-contact-thread-loading"
                  className="flex items-center justify-center py-10"
                >
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : conversation.length === 0 ? (
                <p
                  data-testid="admin-contact-thread-empty"
                  className="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No messages found for this sender.
                </p>
              ) : (
                conversation.map((entry, index) => (
                  <div
                    key={entry.key}
                    data-testid={`admin-contact-thread-message-${entry.key}`}
                    className={`rounded-lg p-4 ${
                      entry.kind === "admin"
                        ? "ml-8 bg-primary-50 dark:bg-primary-900/15 border border-primary-100 dark:border-primary-900/40"
                        : "mr-8 bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {entry.subject}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          entry.kind === "admin"
                            ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                            : index === 0
                            ? "bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {entry.kind === "admin"
                          ? "You replied"
                          : index === 0
                          ? "Latest"
                          : selectedThread.latest_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(entry.at).toLocaleString()}
                    </p>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                      {entry.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* In-app reply — emailed to the sender via the contact-reply
                Edge Function and recorded in the conversation above. */}
            <div className="mt-4">
              <textarea
                data-testid="admin-contact-reply-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder={`Reply to ${selectedThread.latest_name}…`}
                className="w-full resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  data-testid="admin-contact-send-reply-btn"
                  onClick={sendReply}
                  disabled={replySending || threadLoading || !replyText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {replySending ? "Sending…" : "Send reply"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                data-testid="admin-contact-mark-read-btn"
                onClick={() => updateThreadStatus(selectedThread.email, "read")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <CheckCircle className="h-4 w-4" /> Mark read
              </button>
              <button
                data-testid="admin-contact-archive-btn"
                onClick={() => updateThreadStatus(selectedThread.email, "archived")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
              <button
                data-testid="admin-contact-spam-btn"
                onClick={() => updateThreadStatus(selectedThread.email, "spam")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 dark:border-danger-900/50 px-3 py-1.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
              >
                <ShieldAlert className="h-4 w-4" /> Spam
              </button>
              <a
                data-testid="admin-contact-reply-btn"
                href={`mailto:${selectedThread.email}?subject=Re: ${encodeURIComponent(
                  latestMessage?.subject ?? selectedThread.latest_subject,
                )}`}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Mail className="h-4 w-4" /> Email app
              </a>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ContactMessages;
