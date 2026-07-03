import { z } from "zod";

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

// Validation for an admin's reply to a contact submission. Sent to the
// contact-reply Edge Function, which re-validates server-side.
export const contactReplySchema = z.object({
  submissionId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1, "Please enter a reply.")
    .max(5000, "Reply is too long (5000 characters max)."),
});
