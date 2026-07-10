import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ModalPortal from "../components/common/ModalPortal";
import RichTextEditor from "../components/common/RichTextEditor";
import { sanitizeNoteHtml, noteTextLength } from "../utils/sanitizeHtml";
import {
  Mail,
  Inbox,
  Archive,
  Ban,
  ShieldAlert,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { useContactInboxCount } from "../hooks/useContactInboxCount";
import { contactReplySchema } from "../lib/schemas/contact";

const PAGE_SIZE = 50;

// Explicit column lists — never select('*') (CLAUDE.md §4).
// Thread rows come from the contact_threads view (034, counts updated in
// 036): one row per sender email carrying the latest message plus per-thread
// counts; message_count includes admin replies stored in metadata.replies.
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
  // Holds sanitized rich-text HTML from RichTextEditor.
  const [replyText, setReplyText] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replySending, setReplySending] = useState(false);
  // Sender block state for the open thread (contact_blocked_senders, 037).
  const [senderBlocked, setSenderBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  // Messages that were unread when the thread was opened — they keep their
  // red dot while the modal is open (so the new ones are easy to spot), even
  // though opening already marked them read; the dots are gone on reopen.
  const [newMessageIds, setNewMessageIds] = useState(() => new Set());
  // Per-tab conversation counts shown on the right of each filter tab.
  const [tabCounts, setTabCounts] = useState(null);
  // Row selection (by sender email) for the bulk delete action.
  const [selectedEmails, setSelectedEmails] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  // Per-message edit state inside the open thread: the conversation entry key
  // being edited and its draft text (plain text for visitor messages,
  // rich-text HTML for admin replies).
  const [editingKey, setEditingKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  // Scrollable thread container — kept pinned to the newest message (bottom).
  const threadListRef = useRef(null);
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

  // Head-only count queries per tab, mirroring the list filters exactly, so
  // each tab badge matches the number of rows shown when it's selected.
  const loadCounts = useCallback(async () => {
    try {
      const head = () =>
        supabase
          .from("contact_threads")
          .select("email", { count: "exact", head: true });
      const [all, unread, read, archived, spam] = await Promise.all([
        head(),
        head().gt("new_count", 0),
        head().eq("latest_status", "read"),
        head().eq("latest_status", "archived"),
        head().eq("latest_status", "spam"),
      ]);
      const results = { all, new: unread, read, archived, spam };
      const next = {};
      for (const [key, res] of Object.entries(results)) {
        if (res.error) throw new Error(res.error.message);
        next[key] = res.count ?? 0;
      }
      setTabCounts(next);
    } catch (err) {
      // Counts are decorative — log and keep the last known values.
      console.error("[ContactMessages] tab counts error:", err.message);
    }
  }, []);

  // newCount is a dependency so an incoming submission (realtime) reloads the
  // list and the fresh conversation appears at the top without a refresh.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    loadCounts();
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
  }, [load, loadCounts, newCount]);

  // Selections don't carry across pages/filters — the rows they referred to
  // are no longer visible.
  useEffect(() => {
    setSelectedEmails(new Set());
  }, [statusFilter, page]);

  const toggleSelected = (email) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedEmails((prev) =>
      prev.size === threads.length ? new Set() : new Set(threads.map((t) => t.email)),
    );
  };

  // Permanently delete every message from the selected senders (RLS: admin
  // delete policy from migration 20260709140509). Destructive — confirmed first.
  const deleteSelected = async () => {
    if (deleting || selectedEmails.size === 0) return;
    const emails = [...selectedEmails];
    const label =
      emails.length === 1 ? "this conversation" : `${emails.length} conversations`;
    if (
      !window.confirm(
        `Delete ${label}? Every message from the selected sender(s) will be permanently removed. This can't be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("contact_submissions")
        .delete()
        .in("email", emails);
      if (deleteError) throw new Error(deleteError.message);

      if (selectedThread && emails.includes(selectedThread.email)) closeThread();
      setSelectedEmails(new Set());
      toast.success(
        emails.length === 1 ? "Conversation deleted." : `${emails.length} conversations deleted.`,
      );
      // Reload so pagination and counts stay accurate.
      const { data, count } = await load();
      setThreads(data);
      setTotal(count);
      loadCounts();
    } catch (err) {
      console.error("[ContactMessages] delete error:", err.message);
      toast.error("Couldn't delete the selected conversations. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Apply a status to every message in a sender's conversation. Threads are
  // triaged as a unit — archiving or flagging spam covers the whole history.
  // Returns true on success so callers (e.g. "Mark read") can close the modal.
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
      loadCounts();
      if (!silent) toast.success(`Conversation marked as ${status}.`);
      return true;
    } catch (err) {
      console.error("[ContactMessages] update error:", err.message);
      if (!silent) toast.error("Couldn't update the conversation. Please try again.");
      return false;
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
    // Default the reply subject to the thread's latest one, Re:-prefixed once.
    setReplySubject(
      /^re:/i.test(thread.latest_subject ?? "")
        ? thread.latest_subject
        : `Re: ${thread.latest_subject}`,
    );
    setEditingKey(null);
    setEditText("");
    setSenderBlocked(false);
    setThreadLoading(true);
    try {
      const messages = await fetchThreadMessages(thread.email);
      setThreadMessages(messages);
      setNewMessageIds(
        new Set(messages.filter((m) => m.status === "new").map((m) => m.id)),
      );
      if (thread.new_count > 0) {
        await updateThreadStatus(thread.email, "read", { silent: true });
      }
      // Non-fatal: the block toggle just starts from "not blocked" on error.
      const { data: blockedRow, error: blockError } = await supabase
        .from("contact_blocked_senders")
        .select("email")
        .eq("email", thread.email.toLowerCase())
        .maybeSingle();
      if (blockError) {
        console.error("[ContactMessages] block lookup error:", blockError.message);
      }
      setSenderBlocked(Boolean(blockedRow));
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
    setReplySubject("");
    setEditingKey(null);
    setEditText("");
    setSenderBlocked(false);
    setNewMessageIds(new Set());
  };

  // Block or unblock the open thread's sender. While blocked, contact-submit
  // silently discards their messages (migration 20260709140532), so nothing new arrives
  // until they're unblocked. Messages they already sent are untouched.
  const toggleBlockSender = async () => {
    if (!selectedThread || blockBusy) return;
    const email = selectedThread.email.toLowerCase();

    if (
      !senderBlocked &&
      !window.confirm(
        `Block ${email}? New messages they send will be discarded — you won't receive anything from them until you unblock them.`,
      )
    ) {
      return;
    }

    setBlockBusy(true);
    try {
      if (senderBlocked) {
        const { error: unblockError } = await supabase
          .from("contact_blocked_senders")
          .delete()
          .eq("email", email);
        if (unblockError) throw new Error(unblockError.message);
        setSenderBlocked(false);
        toast.success("Sender unblocked — their messages will come through again.");
      } else {
        const { error: blockError } = await supabase
          .from("contact_blocked_senders")
          .insert({ email });
        if (blockError) throw new Error(blockError.message);
        setSenderBlocked(true);
        toast.success("Sender blocked. You won't receive new messages from them.");
      }
    } catch (err) {
      console.error("[ContactMessages] block toggle error:", err.message);
      toast.error("Couldn't update the block status. Please try again.");
    } finally {
      setBlockBusy(false);
    }
  };

  // Refresh the open thread and the list after a message-level change —
  // message_count and tab counts move when a message is added or removed.
  // Closes the modal if the whole thread is gone.
  const refreshAfterMessageChange = async (email) => {
    const messages = await fetchThreadMessages(email);
    if (messages.length === 0) {
      closeThread();
    } else {
      setThreadMessages(messages);
    }
    const { data, count } = await load();
    setThreads(data);
    setTotal(count);
    loadCounts();
  };

  // Delete one message from the open thread. Visitor emails are rows in
  // contact_submissions (admin DELETE policy, migration 20260709140509); admin replies
  // live in the parent row's metadata.replies array (UPDATE policy, 024).
  // Neither recalls an email already delivered to the recipient's mailbox —
  // this only removes the inbox's stored copy.
  const deleteEntry = async (entry) => {
    if (messageBusy) return;
    const parent = threadMessages.find(
      (m) => m.id === (entry.kind === "admin" ? entry.parentId : entry.id),
    );
    if (!parent) return;

    const warning =
      entry.kind === "admin"
        ? "Delete this reply? It's removed from this conversation only — the email that was already sent can't be recalled."
        : Array.isArray(parent.metadata?.replies) && parent.metadata.replies.length > 0
        ? "Delete this message? Your replies attached to it will be removed from the conversation too. This can't be undone."
        : "Delete this message? This can't be undone.";
    if (!window.confirm(warning)) return;

    setMessageBusy(true);
    try {
      if (entry.kind === "visitor") {
        const { error: deleteError } = await supabase
          .from("contact_submissions")
          .delete()
          .eq("id", entry.id);
        if (deleteError) throw new Error(deleteError.message);
      } else {
        const replies = parent.metadata.replies.filter((_, i) => i !== entry.replyIndex);
        const { error: updateError } = await supabase
          .from("contact_submissions")
          .update({ metadata: { ...parent.metadata, replies } })
          .eq("id", entry.parentId);
        if (updateError) throw new Error(updateError.message);
      }
      toast.success(entry.kind === "admin" ? "Reply deleted." : "Message deleted.");
      await refreshAfterMessageChange(parent.email);
    } catch (err) {
      console.error("[ContactMessages] message delete error:", err.message);
      toast.error("Couldn't delete the message. Please try again.");
    } finally {
      setMessageBusy(false);
    }
  };

  const startEdit = (entry) => {
    setEditingKey(entry.key);
    setEditText(entry.message);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditText("");
  };

  // Save an edited reply. Only admin replies are editable — a visitor's
  // message is their words, not ours. Edits only change the copy stored in
  // the inbox; the email that already went out is unchanged.
  const saveEdit = async (entry) => {
    if (messageBusy || entry.kind !== "admin") return;
    const parent = threadMessages.find((m) => m.id === entry.parentId);
    if (!parent) return;

    setMessageBusy(true);
    try {
      // Same pipeline as sendReply: sanitize, then validate visible length.
      // The entry's own subject satisfies the schema — editing keeps it.
      const parsed = contactReplySchema.safeParse({
        subject: entry.subject,
        message: sanitizeNoteHtml(editText),
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      const replies = parent.metadata.replies.map((r, i) =>
        i === entry.replyIndex
          ? { ...r, message: parsed.data.message, editedAt: new Date().toISOString() }
          : r,
      );
      const { error: updateError } = await supabase
        .from("contact_submissions")
        .update({ metadata: { ...parent.metadata, replies } })
        .eq("id", entry.parentId);
      if (updateError) throw new Error(updateError.message);
      cancelEdit();
      toast.success("Message updated.");
      setThreadMessages(await fetchThreadMessages(parent.email));
    } catch (err) {
      console.error("[ContactMessages] message edit error:", err.message);
      toast.error("Couldn't save the changes. Please try again.");
    } finally {
      setMessageBusy(false);
    }
  };

  // Email the sender from inside the app (contact-reply Edge Function). The
  // reply is attached to the newest message in the thread and shows up in the
  // conversation below once it's recorded.
  const sendReply = async () => {
    const latest = threadMessages[0];
    if (!latest || replySending) return;

    // Editor output is already sanitized on change; sanitize again at the
    // trust boundary before it leaves the app (CLAUDE.md §2).
    const parsed = contactReplySchema.safeParse({
      subject: replySubject,
      message: sanitizeNoteHtml(replyText),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setReplySending(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "contact-reply",
        {
          body: {
            submissionId: latest.id,
            subject: parsed.data.subject,
            message: parsed.data.message,
          },
        },
      );
      if (invokeError || data?.success === false) {
        throw new Error(data?.error ?? invokeError.message);
      }
      setReplyText("");
      toast.success("Reply sent.");
      // Reload the history so the new reply appears in the conversation.
      setThreadMessages(await fetchThreadMessages(latest.email));
      // The row badge counts replies too (migration 20260709140521) — refresh the list
      // so it bumps without waiting for a realtime event.
      const { data: freshThreads, count } = await load();
      setThreads(freshThreads);
      setTotal(count);
    } catch (err) {
      console.error("[ContactMessages] reply error:", err.message);
      toast.error("Couldn't send the reply. Please try again.");
    } finally {
      setReplySending(false);
    }
  };

  // Flatten visitor messages and admin replies into one conversation in
  // chronological order — oldest at the top, the newest message at the bottom
  // (the container is kept scrolled to the bottom, like a chat).
  const conversation = useMemo(() => {
    const entries = [];
    for (const m of threadMessages) {
      entries.push({
        kind: "visitor",
        key: m.id,
        id: m.id,
        subject: m.subject,
        message: m.message,
        at: m.created_at,
      });
      const replies = Array.isArray(m.metadata?.replies) ? m.metadata.replies : [];
      replies.forEach((r, i) => {
        entries.push({
          kind: "admin",
          key: `${m.id}-reply-${i}`,
          parentId: m.id,
          replyIndex: i,
          // Replies carry their own subject since the composer gained one;
          // older ones fall back to Re: the email they answered.
          subject: r.subject ?? `Re: ${m.subject}`,
          message: r.message,
          at: r.at,
          by: r.by,
          editedAt: r.editedAt ?? null,
        });
      });
    }
    return entries.sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [threadMessages]);

  // Pin the thread to the newest message whenever the conversation changes
  // (open, incoming reload, or a reply just sent).
  useEffect(() => {
    const el = threadListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const latestMessage = threadMessages[0] ?? null;
  // Prefer the freshly loaded conversation length (emails + replies); fall
  // back to the list row's count (also emails + replies since migration 20260709140521)
  // while the thread is still loading.
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

      {/* Status filter — every tab shows its conversation count on the right */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = tabCounts?.[f.value];
          return (
            <button
              key={f.value}
              data-testid={`admin-contact-filter-${f.value}`}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
              {count != null && (
                <span
                  data-testid={
                    f.value === "new"
                      ? "admin-contact-new-tab-badge"
                      : `admin-contact-tab-count-${f.value}`
                  }
                  className={`min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                    active
                      ? "bg-white/25 text-white"
                      : f.value === "new" && count > 0
                      ? "bg-danger-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk actions for checked rows */}
      {selectedEmails.size > 0 && (
        <div
          data-testid="admin-contact-selection-bar"
          className="flex items-center justify-between rounded-lg border border-danger-200 dark:border-danger-900/50 bg-danger-50 dark:bg-danger-900/15 px-4 py-2"
        >
          <p className="text-sm font-medium text-danger-700 dark:text-danger-300">
            {selectedEmails.size} selected
          </p>
          <button
            data-testid="admin-contact-delete-selected-btn"
            onClick={deleteSelected}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  data-testid="admin-contact-select-all"
                  aria-label="Select all conversations"
                  checked={threads.length > 0 && selectedEmails.size === threads.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-900"
                />
              </th>
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
                  onClick={() => openThread(t)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  {/* stopPropagation: checking a row must not open it */}
                  <td className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      data-testid={`admin-contact-select-${t.latest_id}`}
                      aria-label={`Select conversation with ${t.email}`}
                      checked={selectedEmails.has(t.email)}
                      onChange={() => toggleSelected(t.email)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm text-gray-900 dark:text-gray-100 ${
                        t.new_count > 0 ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {t.latest_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      {t.email}
                      {/* Unread dot — cleared when the thread is opened
                          (opening marks the conversation read). */}
                      {t.new_count > 0 && (
                        <span
                          data-testid={`admin-contact-unread-dot-${t.latest_id}`}
                          className="h-2 w-2 shrink-0 rounded-full bg-danger-500"
                        />
                      )}
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
            // Fixed height so the modal doesn't grow/shrink with the thread —
            // the message list flexes and scrolls inside it.
            className="flex h-[min(85vh,46rem)] w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
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
                  {threadCount} {threadCount === 1 ? "message" : "messages"} — newest at the bottom
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

            <div ref={threadListRef} className="mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto">
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
                conversation.map((entry, index) => {
                  const isNewest = index === conversation.length - 1;
                  const isEditing = editingKey === entry.key;
                  // Admin replies may carry rich-text HTML (headings, lists);
                  // older plain-text replies fall back to the text renderer.
                  const isHtmlReply =
                    entry.kind === "admin" && /<[a-z][^>]*>/i.test(entry.message);
                  return (
                    <div
                      key={entry.key}
                      data-testid={`admin-contact-thread-message-${entry.key}`}
                      className={`rounded-lg p-4 ${
                        entry.kind === "admin"
                          ? "ml-auto w-1/2 bg-primary-50 dark:bg-primary-900/15 border border-primary-100 dark:border-primary-900/40"
                          : "mr-8 bg-gray-50 dark:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {entry.kind === "visitor" && newMessageIds.has(entry.id) && (
                            <span
                              data-testid={`admin-contact-message-unread-dot-${entry.key}`}
                              className="h-2 w-2 shrink-0 rounded-full bg-danger-500"
                            />
                          )}
                          {entry.subject}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              entry.kind === "admin"
                                ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                                : isNewest
                                ? "bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {entry.kind === "admin"
                              ? "You replied"
                              : isNewest
                              ? "Latest"
                              : selectedThread.latest_name}
                          </span>
                          {!isEditing && (
                            <>
                              {/* Only our own replies are editable — a
                                  visitor's message stays their words. */}
                              {entry.kind === "admin" && (
                                <button
                                  data-testid={`admin-contact-message-edit-btn-${entry.key}`}
                                  onClick={() => startEdit(entry)}
                                  disabled={messageBusy}
                                  title="Edit reply"
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                data-testid={`admin-contact-message-delete-btn-${entry.key}`}
                                onClick={() => deleteEntry(entry)}
                                disabled={messageBusy}
                                title="Delete message"
                                className="rounded p-1 text-gray-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20 dark:hover:text-danger-400 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(entry.at).toLocaleString()}
                        {entry.editedAt && (
                          <span className="ml-1 italic">(edited)</span>
                        )}
                      </p>
                      {/* Long emails scroll inside their own bubble (max-h)
                          instead of stretching the thread. */}
                      {isEditing ? (
                        <div className="mt-2">
                          <RichTextEditor
                            testId={`admin-contact-message-edit-input-${entry.key}`}
                            value={editText}
                            onChange={setEditText}
                            withHeadings
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              data-testid={`admin-contact-message-edit-cancel-${entry.key}`}
                              onClick={cancelEdit}
                              disabled={messageBusy}
                              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              data-testid={`admin-contact-message-edit-save-${entry.key}`}
                              onClick={() => saveEdit(entry)}
                              disabled={messageBusy}
                              className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                              {messageBusy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : isHtmlReply ? (
                        <div
                          className="rich-text-content mt-2 max-h-56 overflow-y-auto text-sm text-gray-800 dark:text-gray-200"
                          // Sanitized with DOMPurify (sanitizeNoteHtml) per CLAUDE.md §2.
                          dangerouslySetInnerHTML={{
                            __html: sanitizeNoteHtml(entry.message),
                          }}
                        />
                      ) : (
                        <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                          {entry.message}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* In-app reply — emailed to the sender via the contact-reply
                Edge Function and recorded in the conversation above. */}
            <div className="mt-4">
              <input
                type="text"
                data-testid="admin-contact-reply-subject-input"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                placeholder="Subject"
                maxLength={150}
                className="mb-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
              />
              <RichTextEditor
                testId="admin-contact-reply-input"
                value={replyText}
                onChange={setReplyText}
                placeholder={`Reply to ${selectedThread.latest_name}…`}
                withHeadings
              />
              <div className="mt-2 flex justify-end">
                <button
                  data-testid="admin-contact-send-reply-btn"
                  onClick={sendReply}
                  disabled={
                    replySending ||
                    threadLoading ||
                    replySubject.trim().length === 0 ||
                    noteTextLength(replyText) === 0
                  }
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
                onClick={async () => {
                  // Marking read is a "done triaging" action — close the modal.
                  if (await updateThreadStatus(selectedThread.email, "read")) closeThread();
                }}
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
              <button
                data-testid="admin-contact-block-btn"
                onClick={toggleBlockSender}
                disabled={blockBusy || threadLoading}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  senderBlocked
                    ? "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    : "border-danger-200 dark:border-danger-900/50 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                }`}
              >
                <Ban className="h-4 w-4" />
                {blockBusy ? "Working…" : senderBlocked ? "Unblock sender" : "Block sender"}
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
