import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Must list every custom header the browser sends, or the preflight fails
  // and the POST never leaves the browser. The Supabase client adds x-app-name
  // (see src/lib/supabase.js), so it has to be allowed here too.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Free model: Google Gemini Flash — same setup as the ai-insights function.
// Get a key at https://aistudio.google.com/apikey → GEMINI_API_KEY secret.
const DEFAULT_MODEL = "gemini-2.5-flash";

// The client sends COMPUTED summaries only (signal levels, factor checklist,
// indicator snapshot, backtest aggregates) — never raw candles or user data.
// Validation keeps a malformed body away from the model; identity comes from
// the JWT below, never the body.
const narrativeInput = z.object({
  symbol: z.string().trim().min(1).max(10),
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]),
  signal: z.object({
    direction: z.enum(["long", "short"]),
    entry: z.number().finite(),
    stopLoss: z.number().finite(),
    takeProfit: z.number().finite(),
    confluencePct: z.number().finite().min(0).max(100),
    tier: z.enum(["high", "medium"]),
    factors: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          passed: z.boolean(),
          detail: z.string().trim().max(120).optional().default(""),
        }),
      )
      .max(8),
  }),
  indicators: z.object({
    ema20: z.number().finite().nullable(),
    ema50: z.number().finite().nullable(),
    rsi14: z.number().finite().nullable(),
    atr14: z.number().finite().nullable(),
  }),
  backtest: z.object({
    winRate: z.number().finite().min(0).max(1).nullable(),
    sampleSize: z.number().finite().min(0),
    avgR: z.number().finite().nullable(),
    expired: z.number().finite().min(0),
  }),
});

// Gemini structured-output schema — guarantees parseable JSON back.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    reasoning: { type: "STRING" },
    riskNotes: { type: "STRING" },
  },
  required: ["summary", "reasoning", "riskNotes"],
};

const SYSTEM_PROMPT =
  "You are a calm, precise trading analyst explaining a rule-based futures " +
  "signal to the trader who received it. You are given the computed signal " +
  "(direction, entry, stop, target, confluence factors), an indicator " +
  "snapshot, and the backtested hit-rate of this rule set on this asset and " +
  "timeframe. Write three parts: 'summary' — one or two sentences stating " +
  "the setup and its confluence in plain language; 'reasoning' — two to four " +
  "sentences explaining WHY the passed and failed factors matter for this " +
  "trade, referencing the actual numbers given; 'riskNotes' — two to three " +
  "sentences covering what invalidates the setup, that the hit-rate is a " +
  "historical measurement (state the sample size) and not a prediction, and " +
  "that this is educational analysis of ~15-minute-delayed data, not " +
  "financial advice. Never invent numbers or levels that are not in the " +
  "input. Plain language, no markdown, no emojis.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Resolve the user from their JWT — this endpoint is authenticated. We
    // never accept a user_id from the body; the token is the only identity.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("You must be signed in to generate an explanation.", 401);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      // Feature not configured — the UI hides the narrative section on 503.
      return errorResponse("AI explanations are not enabled yet.", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request.", 400);
    }

    const parsed = narrativeInput.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid signal data.", 400);
    }

    const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Explain this signal. Input JSON:\n\n" +
                    JSON.stringify(parsed.data),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            // Headroom: 2.5 models spend part of the budget on internal
            // reasoning before emitting the JSON, so keep this generous.
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("ai-signal-narrative gemini error:", geminiRes.status, errText);
      let reason = "Could not generate the explanation right now.";
      if (/API_KEY_INVALID|API key not valid/i.test(errText)) {
        reason = "The AI service key is invalid. Set a valid Gemini API key (starts with 'AIza').";
      } else if (geminiRes.status === 429) {
        reason = "The AI service is rate-limited right now. Please try again shortly.";
      } else if (geminiRes.status === 404) {
        reason = "The configured AI model is unavailable. Check the GEMINI_MODEL setting.";
      }
      return errorResponse(reason, 502);
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      return errorResponse("Could not generate the explanation right now.", 502);
    }

    let narrative: { summary?: string; reasoning?: string; riskNotes?: string };
    try {
      narrative = JSON.parse(text);
    } catch {
      return errorResponse("Could not generate the explanation right now.", 502);
    }
    if (!narrative?.summary || !narrative?.reasoning || !narrative?.riskNotes) {
      return errorResponse("Could not generate the explanation right now.", 502);
    }

    return successResponse({
      summary: narrative.summary,
      reasoning: narrative.reasoning,
      riskNotes: narrative.riskNotes,
    });
  } catch (err) {
    console.error("ai-signal-narrative error:", err);
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
