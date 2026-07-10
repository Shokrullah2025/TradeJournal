// Shared admin bell notification for the Contact Inbox.
//
// Two distinct behaviours, deliberately kept apart:
//
//  • "message" — a newly RECEIVED message from the public contact form
//    (contact-submit). These are aggregated into a SINGLE "N new messages"
//    notification per admin, across all senders: each new one bumps the count
//    and moves the entry to the top of the bell. Once the admin reads or
//    deletes it, the next message starts a fresh one. One entry is enough — the
//    number just goes up.
//
//  • "reply" — a visitor replying inside an existing thread (contact-inbound).
//    A reply is NOT a new inquiry, so folding it into the "N new messages"
//    counter would be misleading. Each reply gets its own individual
//    "New reply from …" notification and never touches the received-message
//    aggregate.
//
// Runs under the service_role key (bypasses RLS). Never throws — the caller has
// already persisted the message and must not fail if notifying hiccups.

interface ContactInput {
  name: string;
  email: string;
  subject: string;
  submissionId: string;
}

export async function notifyAdminsContact(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: ContactInput,
  kind: "message" | "reply",
): Promise<void> {
  const logPrefix = kind === "reply" ? "contact-inbound" : "contact-submit";
  try {
    const { data: admins, error: adminsError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");
    if (adminsError || !admins?.length) {
      if (adminsError) {
        console.error(`${logPrefix} admin lookup failed:`, adminsError.message);
      }
      return;
    }

    await Promise.all(
      admins.map(({ id: adminId }: { id: string }) =>
        kind === "reply"
          ? insertReplyNotification(supabase, adminId, input, logPrefix)
          : bumpMessageAggregate(supabase, adminId, input, logPrefix)
      ),
    );
  } catch (err) {
    console.error(`${logPrefix} admin notification failed:`, err);
  }
}

// Received contact-form messages: one aggregated "N new messages" entry per
// admin, incremented across all senders.
async function bumpMessageAggregate(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  adminId: string,
  input: ContactInput,
  logPrefix: string,
): Promise<void> {
  // The single unread received-message notification for this admin, regardless
  // of sender — that's what makes one bell entry cover everyone.
  const { data: existing } = await supabase
    .from("notifications")
    .select("id, metadata")
    .eq("user_id", adminId)
    .eq("category", "contact")
    .eq("event_type", "contact_message")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const count = (Number(existing.metadata?.count) || 1) + 1;
    const { error } = await supabase
      .from("notifications")
      .update({
        title: `${count} new messages`,
        body: `Latest from ${input.name}: ${input.subject}`,
        metadata: {
          ...existing.metadata,
          count,
          latest_submission_id: input.submissionId,
          latest_sender_email: input.email,
          latest_sender_name: input.name,
        },
        // Bump so the aggregated entry surfaces at the top of the bell.
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      console.error(`${logPrefix} notification bump failed:`, error.message);
    }
  } else {
    const { error } = await supabase.from("notifications").insert({
      user_id: adminId,
      category: "contact",
      event_type: "contact_message",
      title: `New message from ${input.name}`,
      body: input.subject,
      severity: "info",
      link_to: "/admin/contact-submissions",
      metadata: {
        count: 1,
        latest_submission_id: input.submissionId,
        latest_sender_email: input.email,
        latest_sender_name: input.name,
      },
    });
    if (error) {
      console.error(`${logPrefix} notification insert failed:`, error.message);
    }
  }
}

// Visitor replies: one individual notification each, kept out of the
// received-message aggregate (a distinct event_type ensures the aggregate
// query above never picks these up).
async function insertReplyNotification(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  adminId: string,
  input: ContactInput,
  logPrefix: string,
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: adminId,
    category: "contact",
    event_type: "contact_reply",
    title: `New reply from ${input.name}`,
    body: input.subject,
    severity: "info",
    link_to: "/admin/contact-submissions",
    metadata: {
      submission_id: input.submissionId,
      sender_email: input.email,
      sender_name: input.name,
    },
  });
  if (error) {
    console.error(`${logPrefix} reply notification insert failed:`, error.message);
  }
}
