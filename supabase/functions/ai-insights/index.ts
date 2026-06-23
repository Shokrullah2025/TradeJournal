import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Must list every custom header the browser sends, or the preflight fails and
  // the POST never leaves the browser. The Supabase client adds x-app-name
  // (see src/lib/supabase.js), so it has to be allowed here too.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Free model: Google Gemini Flash. Get a free API key at
// https://aistudio.google.com/apikey and set it as the GEMINI_API_KEY secret.
// The model id is overridable via GEMINI_MODEL in case Google renames it or a
// key only has free quota for a different model.
const DEFAULT_MODEL = "gemini-2.5-flash";

// Client-supplied aggregates about the requester's OWN trades. Not a security
// boundary (the user can only describe their own numbers), but we validate so a
// malformed body can't reach the model. Identity is resolved server-side below.
const insightInput = z.object({
  stats: z.object({
    totalTrades: z.number().finite(),
    winRate: z.number().finite(),
    totalPnL: z.number().finite(),
    avgWin: z.number().finite(),
    avgLoss: z.number().finite(),
    profitFactor: z.number().finite(),
    maxDrawdown: z.number().finite(),
  }),
  instruments: z
    .array(
      z.object({
        symbol: z.string().trim().min(1).max(20),
        trades: z.number().finite(),
        pnl: z.number().finite(),
      }),
    )
    .max(10)
    .optional()
    .default([]),
  recentStreak: z
    .object({ type: z.enum(["win", "loss"]), length: z.number().finite() })
    .nullable()
    .optional()
    .default(null),
});

// Gemini structured-output schema — guarantees parseable JSON back.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    insights: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tone: {
            type: "STRING",
            enum: ["positive", "warning", "info"],
          },
          text: { type: "STRING" },
        },
        required: ["tone", "text"],
      },
    },
  },
  required: ["insights"],
};

const SYSTEM_PROMPT =
  "You are a concise, supportive trading coach for a personal trade journal. " +
  "Given a trader's own performance statistics, return EXACTLY 3 insights that " +
  "help them improve. Each insight must be specific to the numbers provided — " +
  "reference real figures (win rate, profit factor, a named instrument, a streak) " +
  "rather than generic advice, and where useful suggest a concrete next step. " +
  "Use tone 'positive' for genuine strengths, 'warning' for risks worth " +
  "addressing, and 'info' for neutral observations. Aim for a mix. Keep each " +
  "insight to one or two sentences, plain language, no markdown, no emojis. " +
  "Never invent data that is not present.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Resolve the user from their JWT — this endpoint is authenticated. We never
    // accept a user_id from the body; the token is the only source of identity.
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
      return errorResponse("You must be signed in to generate insights.", 401);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      // Feature not configured — tell the UI to degrade gracefully, not crash.
      return errorResponse("AI insights are not enabled yet.", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request.", 400);
    }

    const parsed = insightInput.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid trading data.", 400);
    }
    const { stats, instruments, recentStreak } = parsed.data;

    if (stats.totalTrades < 1) {
      return errorResponse(
        "Add a few closed trades before generating insights.",
        400,
      );
    }

    const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
    const userData = JSON.stringify({ stats, instruments, recentStreak });

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
                    "Here is my trading performance data as JSON. Give me 3 insights.\n\n" +
                    userData,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
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
      console.error("ai-insights gemini error:", geminiRes.status, errText);
      // Surface the most common, actionable causes instead of a generic message.
      let reason = "Could not generate insights right now.";
      if (/API_KEY_INVALID|API key not valid/i.test(errText)) {
        reason =
          "The AI service key is invalid. Set a valid Gemini API key (starts with 'AIza').";
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
      return errorResponse("Could not generate insights right now.", 502);
    }

    let insights: Array<{ tone: string; text: string }>;
    try {
      insights = JSON.parse(text).insights;
    } catch {
      return errorResponse("Could not generate insights right now.", 502);
    }
    if (!Array.isArray(insights) || insights.length === 0) {
      return errorResponse("Could not generate insights right now.", 502);
    }

    return successResponse({ insights });
  } catch (err) {
    console.error("ai-insights error:", err);
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
