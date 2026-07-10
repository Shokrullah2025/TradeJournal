import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin-only one-shot cleanup: removes orphaned files from the `trade-images`
// bucket — files no longer referenced by an active trade_images row. This
// covers (a) images left behind by the old soft-delete behaviour and (b) files
// orphaned when a trade was deleted (the row cascade never touched storage).
// Deletion goes through the storage API (not SQL) so the backing object is
// actually removed, not just its metadata row.
const BUCKET = "trade-images";
const REMOVE_BATCH = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
};

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

    // Resolve identity from the JWT and gate on admin role.
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return errorResponse("Could not verify your permissions.", 500);
    if (profile?.role !== "admin") return errorResponse("Admin access required.", 403);

    // 1. Enumerate every object currently in the bucket. Paths are two levels:
    //    `${userId}/${file}` — so list the root (user folders), then each folder.
    const bucket = supabase.storage.from(BUCKET);
    const allPaths: string[] = [];
    const folders = await listAll(bucket, "");
    for (const entry of folders) {
      if (entry.id === null) {
        const files = await listAll(bucket, entry.name);
        for (const f of files) {
          if (f.id !== null) allPaths.push(`${entry.name}/${f.name}`);
        }
      } else {
        // A file sitting at the bucket root (not expected, but don't lose it).
        allPaths.push(entry.name);
      }
    }

    // 2. Build the keep-set: files referenced by a live (non-deleted) row.
    const { data: activeRows, error: activeError } = await supabase
      .from("trade_images")
      .select("image_url")
      .is("deleted_at", null);
    if (activeError) return errorResponse("Could not read trade images.", 500);
    const keep = new Set((activeRows ?? []).map((r) => r.image_url).filter(Boolean));

    // 3. Anything in the bucket that isn't referenced is an orphan.
    const orphans = allPaths.filter((p) => !keep.has(p));

    let removed = 0;
    for (let i = 0; i < orphans.length; i += REMOVE_BATCH) {
      const batch = orphans.slice(i, i + REMOVE_BATCH);
      const { error: removeError } = await bucket.remove(batch);
      if (removeError) {
        console.error("purge remove error:", removeError.message);
      } else {
        removed += batch.length;
      }
    }

    // 4. Clean up the now-dangling soft-deleted rows (their files are gone).
    const { data: purgedRows, error: purgeError } = await supabase
      .from("trade_images")
      .delete()
      .not("deleted_at", "is", null)
      .select("id");
    if (purgeError) console.error("purge rows error:", purgeError.message);

    return successResponse({
      scanned: allPaths.length,
      kept: keep.size,
      orphansRemoved: removed,
      softDeletedRowsPurged: purgedRows?.length ?? 0,
    });
  } catch (err) {
    console.error("admin-purge-trade-images error:", err);
    return errorResponse("Purge failed. Please try again.", 500);
  }
});

// Lists every entry under a prefix, paging past the 100-row default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listAll(bucket: any, prefix: string) {
  const all: Array<{ id: string | null; name: string }> = [];
  const limit = 100;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const page = data ?? [];
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
