import { z } from "zod";
import { noteTextLength } from "../../utils/sanitizeHtml";

// Validation for the admin in-app reply (Contact Inbox thread view). Mirrored
// server-side in the contact-reply Edge Function. The message is sanitized
// rich-text HTML from RichTextEditor, so the 5000-char limit is enforced on
// the visible text (noteTextLength), with a generous cap on the raw markup.
export const contactReplySchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Please add a subject.")
    .max(150, "Subject is too long (150 characters max)."),
  message: z
    .string()
    .trim()
    .max(20000, "Reply is too long (5000 characters max).")
    .refine((html) => noteTextLength(html) >= 1, "Please enter a reply message.")
    .refine(
      (html) => noteTextLength(html) <= 5000,
      "Reply is too long (5000 characters max).",
    ),
});

// Validation for the public Contact form. Front-end only — no DB write — but
// kept in src/lib/schemas/ per the project convention so it's reusable if the
// form is later wired to an Edge Function.
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "Name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(3, "Please add a short subject.")
    .max(120, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(10, "Please share a little more detail (10+ characters).")
    .max(2000, "Message is too long (2000 characters max)."),
});
