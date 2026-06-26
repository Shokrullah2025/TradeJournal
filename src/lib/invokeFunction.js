import { supabase } from "./supabase";

// Calls a Supabase Edge Function and surfaces the *real* error to the caller.
//
// Why this exists: `supabase.functions.invoke()` treats any non-2xx response as
// an error — it returns a `FunctionsHttpError` in `error` and leaves `data`
// null. Our Edge Functions report failures with a friendly body like
// `{ success: false, error: "You've already used your free trial." }` AND a
// non-2xx status, so that message ends up hidden inside `error.context` (the raw
// Response) rather than in `data`. Callers that only read `data?.error` silently
// fall back to a generic string and the user never learns why it failed.
//
// This helper pulls the message out of `error.context` so the user sees the
// actual reason. On success it returns the function's `data.data` payload.
export async function invokeFunction(
  name,
  options,
  fallbackMessage = "Something went wrong. Please try again.",
) {
  // Preserve call arity — omit the options arg entirely when not provided.
  const { data, error } =
    options === undefined
      ? await supabase.functions.invoke(name)
      : await supabase.functions.invoke(name, options);

  if (error) {
    const message = await extractEdgeError(error);
    throw new Error(message || error.message || fallbackMessage);
  }

  if (!data?.success) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data.data;
}

// FunctionsHttpError carries the original Response in `context`. Read its JSON
// body to recover the `{ error }` message our functions return. Cloning keeps
// the body readable if anything else inspects the response.
async function extractEdgeError(error) {
  try {
    const res = error?.context;
    if (res && typeof res.clone === "function") {
      const body = await res.clone().json();
      if (body?.error) return body.error;
    } else if (res && typeof res.error === "string") {
      // Some environments expose an already-parsed body.
      return res.error;
    }
  } catch {
    // Body wasn't JSON or was already consumed — fall back to the generic message.
  }
  return null;
}

export default invokeFunction;
