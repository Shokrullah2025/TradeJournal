import { z } from "zod";

export const MAX_SESSION_TAGS = 10;

export const sessionTagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(30, "Tags must be 30 characters or fewer");

// Editable metadata on a backtest session (history modal)
export const sessionMetaSchema = z.object({
  note: z.string().trim().max(2000, "Note must be 2,000 characters or fewer"),
  tags: z
    .array(sessionTagSchema)
    .max(MAX_SESSION_TAGS, `A session can have at most ${MAX_SESSION_TAGS} tags`),
});
