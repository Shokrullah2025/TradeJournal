import { z } from "zod";

export const MAX_SESSION_TAGS = 10;

export const sessionTagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(30, "Tags must be 30 characters or fewer");

// Notes are stored as sanitized rich-text HTML, so the raw string is markup +
// text. The limit is generous to leave room for formatting overhead while still
// capping abuse.
export const MAX_NOTE_HTML_LENGTH = 10000;

// Editable metadata on a backtest session (history modal)
export const sessionMetaSchema = z.object({
  note: z.string().trim().max(MAX_NOTE_HTML_LENGTH, "Note is too long — please shorten it"),
  tags: z
    .array(sessionTagSchema)
    .max(MAX_SESSION_TAGS, `A session can have at most ${MAX_SESSION_TAGS} tags`),
});
