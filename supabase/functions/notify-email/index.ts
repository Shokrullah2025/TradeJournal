import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sends the email for an existing notification. Invoked client-side by
// emitNotification() for key events (e.g. new_login). The notification row and
// the user's email preference are the source of truth — this function only
// delivers and records the outcome on the row.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing Authorization header", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    const { notificationId } = await req.json();
    if (!notificationId) return errorResponse("Missing notificationId", 400);

    // Confirm the notification belongs to the caller before sending.
    const { data: row } = await supabase
      .from("notifications")
      .select("id, user_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (!row || row.user_id !== user.id) {
      return errorResponse("Notification not found", 404);
    }

    const status = await sendNotificationEmail(supabase, notificationId);
    return successResponse({ status });
  } catch (err) {
    console.error("notify-email error:", err);
    return errorResponse("Internal server error", 500);
  }
});

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
