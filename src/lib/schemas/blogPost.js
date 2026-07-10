import { z } from "zod";

// Validation for admin-authored blog posts (Admin → Blog tab). Runs before any
// insert/update against public.blog_posts so a half-filled editor can never
// persist an unrenderable article. The shape mirrors the static content module
// (src/components/site/blogPosts.js) so both sources render identically.

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Intro and section body are rich text (sanitized HTML from RichTextEditor), so
// length limits are measured against the visible text, not the markup. Static
// posts store plain strings, which pass through these helpers unchanged.
const stripTags = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
const visibleLen = (s) => stripTags(s).length;

export const blogSectionSchema = z.object({
  heading: z
    .string()
    .trim()
    .min(3, "Each section needs a heading (3+ characters).")
    .max(200, "Section heading is too long (200 characters max)."),
  paragraphs: z
    .array(
      z
        .string()
        .trim()
        .max(20000, "A paragraph is too long (20000 characters max).")
        .refine((v) => visibleLen(v) >= 1, "Paragraphs cannot be empty.")
    )
    .min(1, "Each section needs at least one paragraph."),
});

export const blogFaqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "FAQ questions need at least 5 characters.")
    .max(300, "FAQ question is too long (300 characters max)."),
  answer: z
    .string()
    .trim()
    .min(5, "FAQ answers need at least 5 characters.")
    .max(2000, "FAQ answer is too long (2000 characters max)."),
});

export const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title needs at least 5 characters.")
    .max(200, "Title is too long (200 characters max)."),
  slug: z
    .string()
    .trim()
    .min(3, "Slug needs at least 3 characters.")
    .max(120, "Slug is too long (120 characters max).")
    .regex(
      SLUG_PATTERN,
      "Slug can only contain lowercase letters, numbers, and single hyphens (e.g. my-first-post)."
    ),
  seoTitle: z
    .string()
    .trim()
    .max(200, "SEO title is too long (200 characters max).")
    .default(""),
  seoDescription: z
    .string()
    .trim()
    .max(320, "SEO description is too long (320 characters max).")
    .default(""),
  intro: z
    .string()
    .trim()
    .max(20000, "Intro is too long (20000 characters max).")
    .refine(
      (v) => visibleLen(v) >= 20,
      "The intro needs at least 20 characters — it doubles as the article summary."
    ),
  coverImageUrl: z
    .string()
    .trim()
    .url("Cover image must be a valid URL.")
    .nullable()
    .or(z.literal("").transform(() => null)),
  tags: z
    .array(z.string().trim().min(1).max(40, "Tags are 40 characters max."))
    .max(8, "Use at most 8 tags."),
  readingTime: z
    .number({ invalid_type_error: "Reading time must be a number." })
    .int("Reading time must be a whole number of minutes.")
    .min(1, "Reading time must be at least 1 minute.")
    .max(120, "Reading time must be 120 minutes or less."),
  sections: z
    .array(blogSectionSchema)
    .min(1, "Add at least one content section."),
  faqs: z.array(blogFaqSchema).max(12, "Use at most 12 FAQs."),
  status: z.enum(["draft", "published"]),
});

/** Turn a title into a URL-safe slug ("How to Journal!" → "how-to-journal"). */
export function slugify(title) {
  return String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

/** Estimate reading time in minutes at ~200 words per minute (min 1). */
export function estimateReadingTime({ intro = "", sections = [] }) {
  const text = [
    intro,
    ...sections.flatMap((s) => [s.heading, ...(s.paragraphs || [])]),
  ].join(" ");
  // Strip any HTML so markup doesn't inflate the word count.
  const words = stripTags(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
