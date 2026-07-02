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

// The client sends COMPUTED summaries only (the ICT daily bias with its
// factor checklist, context flags, backtested accuracy) — never raw candles
// or user data. Validation keeps a malformed body away from the model;
// identity comes from the JWT below, never the body.
const narrativeInput = z.object({
  symbol: z.string().trim().min(1).max(10),
  bias: z.object({
    bias: z.enum(["long", "short", "neutral"]),
    score: z.number().finite(),
    maxScore: z.number().finite().min(0),
    confidencePct: z.number().finite().min(0).max(100),
    classification: z.object({
      type: z.enum(["expansion", "retracement", "reversal", "consolidation"]).nullable(),
      direction: z.enum(["up", "down", "none"]).nullable(),
      closeLocation: z.enum(["upper", "middle", "lower"]).nullable(),
    }),
    reasons: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          points: z.number().finite(),
          detail: z.string().trim().max(160).optional().default(""),
        }),
      )
      .max(10),
  }),
  context: z.object({
    premiumDiscount: z.enum(["premium", "discount", "equilibrium"]).nullable(),
    prevWeekType: z.enum(["expansion", "retracement", "reversal", "consolidation"]).nullable(),
    smtDaily: z.enum(["bullish", "bearish"]).nullable(),
    smtWeekly: z.enum(["bullish", "bearish"]).nullable(),
    judas: z.enum(["bullish", "bearish"]).nullable(),
  }),
  accuracy: z.object({
    winRate: z.number().finite().min(0).max(1).nullable(),
    sampleSize: z.number().finite().min(0),
    unresolved: z.number().finite().min(0),
  }),
  // The entry-setup snapshot — optional so bias-only payloads keep validating.
  setup: z
    .object({
      state: z.enum([
        "NO_BIAS",
        "WAITING_FOR_OB",
        "WAITING_FOR_TAP",
        "AWAITING_CONFIRMATION",
        "SETUP_ACTIVE",
        "SMT_BLOCKED",
      ]),
      direction: z.enum(["long", "short"]).nullable(),
      entry: z.number().finite().nullable(),
      stop: z.number().finite().nullable(),
      target: z.number().finite().nullable(),
      targetLabel: z.enum(["pdh", "pdl", "pwh", "pwl"]).nullable(),
      rr: z.number().finite().nullable(),
      smtStatus: z.enum(["agree", "disagree", "no-data", "no-pair"]).nullable(),
      accuracy: z
        .object({
          winRate: z.number().finite().min(0).max(1).nullable(),
          sampleSize: z.number().finite().min(0),
          avgR: z.number().finite().nullable(),
        })
        .nullable(),
    })
    .optional(),
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
  "You are a calm, precise trading analyst explaining an ICT-style top-down " +
  "DAILY BIAS for a futures market — not a trade signal; there is no entry, " +
  "stop or target. You are given the bias (long, short or neutral) with its " +
  "signed factor checklist (positive points favor longs, negative favor " +
  "shorts), how the last daily candle is classified, context flags (premium/" +
  "discount, previous week's candle type, SMT divergence against the " +
  "correlated index, London Judas swing), and the backtested accuracy of " +
  "these exact rules on this asset. Write three parts: 'summary' — one or " +
  "two sentences stating the bias and the day's candle character in plain " +
  "language (a neutral bias means the day does not line up, and that is a " +
  "valid finding); 'reasoning' — two to four sentences explaining WHY the " +
  "strongest factors for and against matter, referencing only the numbers " +
  "and labels given; 'riskNotes' — two to three sentences stating that no " +
  "entry or stop is provided, that the accuracy figure is a historical " +
  "measurement of these rules (state the sample size) and not a prediction, " +
  "that the next session can invalidate the bias by taking out the opposite " +
  "prior-day extreme, and that this is educational analysis of ~15-minute-" +
  "delayed data, not financial advice. When a 'setup' object is present, " +
  "also describe where price is in the entry sequence (bias, order block, " +
  "tap, confirmation, entry) in plain language; when its state is " +
  "SETUP_ACTIVE, restate the given entry, stop, target and reward:risk as " +
  "mechanical rule outputs — never invent or adjust them — and cite the " +
  "setup's own backtested winRate and sample size from setup.accuracy in " +
  "the risk notes, noting it is a measurement, not an instruction to trade. " +
  "Never invent numbers or levels that " +
  "are not in the input. Plain language, no markdown, no emojis.";

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
