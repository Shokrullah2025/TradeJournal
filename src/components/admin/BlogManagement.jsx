import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ImagePlus,
  X,
  Eye,
  Globe,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { logActivity } from "../../utils/logActivity";
import { compressImageToWebP } from "../../utils/image";
import { formatLongDate } from "../../utils/date";
import {
  blogPostSchema,
  slugify,
  estimateReadingTime,
} from "../../lib/schemas/blogPost";

// ── Blog management admin panel ────────────────────────────────────────────
// Lets admins publish articles to the public /blog without code changes. Posts
// live in public.blog_posts (RLS: public read of published rows, admin-only
// writes) and cover images in the public `blog-images` storage bucket. The
// editor mirrors the static content module's shape — intro, sections (heading
// + paragraphs), FAQs, SEO fields — so admin posts render identically to the
// hardcoded ones on the marketing site.

const BLOG_IMAGE_BUCKET = "blog-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (CLAUDE.md §2 file uploads)
const COVER_MAX_DIMENSION = 1200; // CLAUDE.md §3: max 1200px wide before upload
const COVER_QUALITY = 0.8;

const ADMIN_COLUMNS =
  "id, slug, title, seo_title, seo_description, intro, cover_image_url, tags, reading_time, sections, faqs, status, published_at, created_at, updated_at";

const emptyForm = () => ({
  id: null,
  title: "",
  slug: "",
  slugTouched: false,
  seoTitle: "",
  seoDescription: "",
  intro: "",
  coverImageUrl: "",
  tagsText: "",
  readingTime: "",
  sections: [{ heading: "", paragraphsText: "" }],
  faqs: [],
  status: "draft",
  publishedAt: null,
});

const rowToForm = (row) => ({
  id: row.id,
  title: row.title ?? "",
  slug: row.slug ?? "",
  slugTouched: true,
  seoTitle: row.seo_title ?? "",
  seoDescription: row.seo_description ?? "",
  intro: row.intro ?? "",
  coverImageUrl: row.cover_image_url ?? "",
  tagsText: (Array.isArray(row.tags) ? row.tags : []).join(", "),
  readingTime: String(row.reading_time ?? ""),
  sections: (Array.isArray(row.sections) && row.sections.length
    ? row.sections
    : [{ heading: "", paragraphs: [] }]
  ).map((s) => ({
    heading: s.heading ?? "",
    paragraphsText: (s.paragraphs ?? []).join("\n\n"),
  })),
  faqs: (Array.isArray(row.faqs) ? row.faqs : []).map((f) => ({
    question: f.question ?? "",
    answer: f.answer ?? "",
  })),
  status: row.status ?? "draft",
  publishedAt: row.published_at ?? null,
});

// Blank-line-separated textarea → paragraphs array (matches static module shape).
const splitParagraphs = (text) =>
  String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const formToCandidate = (form) => ({
  title: form.title.trim(),
  slug: form.slug.trim(),
  seoTitle: form.seoTitle.trim(),
  seoDescription: form.seoDescription.trim(),
  intro: form.intro.trim(),
  coverImageUrl: form.coverImageUrl.trim() || null,
  tags: form.tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
  readingTime: form.readingTime === "" ? NaN : Number(form.readingTime),
  sections: form.sections.map((s) => ({
    heading: s.heading.trim(),
    paragraphs: splitParagraphs(s.paragraphsText),
  })),
  faqs: form.faqs
    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
    .filter((f) => f.question || f.answer),
  status: form.status,
});

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      status === "published"
        ? "bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300"
        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
    }`}
  >
    {status === "published" ? (
      <Globe className="w-3 h-3" />
    ) : (
      <EyeOff className="w-3 h-3" />
    )}
    {status === "published" ? "Published" : "Draft"}
  </span>
);

StatusBadge.propTypes = { status: PropTypes.string };

const FieldLabel = ({ htmlFor, children, hint }) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
  >
    {children}
    {hint && (
      <span className="ml-2 font-normal text-xs text-gray-400 dark:text-gray-500">
        {hint}
      </span>
    )}
  </label>
);

FieldLabel.propTypes = {
  htmlFor: PropTypes.string,
  children: PropTypes.node,
  hint: PropTypes.string,
};

const FieldError = ({ id, message }) =>
  message ? (
    <p
      id={id}
      data-testid={id}
      className="mt-1 text-xs text-danger-600 dark:text-danger-400"
    >
      {message}
    </p>
  ) : null;

FieldError.propTypes = { id: PropTypes.string, message: PropTypes.string };

const BlogManagement = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [view, setView] = useState("list"); // 'list' | 'editor'
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null); // row-level publish/delete spinner
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(ADMIN_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTableMissing(false);
      setPosts(data ?? []);
    } catch (err) {
      console.error("[BlogManagement] load error:", err.message);
      setTableMissing(true);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const liveEstimate = useMemo(
    () =>
      estimateReadingTime({
        intro: form.intro,
        sections: form.sections.map((s) => ({
          heading: s.heading,
          paragraphs: splitParagraphs(s.paragraphsText),
        })),
      }),
    [form.intro, form.sections]
  );

  const setField = (name, value) =>
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Keep the slug following the title until the admin edits it directly.
      if (name === "title" && !f.slugTouched) next.slug = slugify(value);
      if (name === "slug") next.slugTouched = true;
      return next;
    });

  const openNew = () => {
    setForm(emptyForm());
    setErrors({});
    setView("editor");
  };

  const openEdit = (row) => {
    setForm(rowToForm(row));
    setErrors({});
    setView("editor");
  };

  const backToList = () => {
    setView("list");
    setErrors({});
  };

  // ── Sections / FAQs editors ──────────────────────────────────────────────
  const updateSection = (index, patch) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const addSection = () =>
    setForm((f) => ({
      ...f,
      sections: [...f.sections, { heading: "", paragraphsText: "" }],
    }));

  const removeSection = (index) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.filter((_, i) => i !== index),
    }));

  const moveSection = (index, delta) =>
    setForm((f) => {
      const target = index + delta;
      if (target < 0 || target >= f.sections.length) return f;
      const sections = [...f.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...f, sections };
    });

  const updateFaq = (index, patch) =>
    setForm((f) => ({
      ...f,
      faqs: f.faqs.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));

  const addFaq = () =>
    setForm((f) => ({ ...f, faqs: [...f.faqs, { question: "", answer: "" }] }));

  const removeFaq = (index) =>
    setForm((f) => ({ ...f, faqs: f.faqs.filter((_, i) => i !== index) }));

  // ── Cover image upload ───────────────────────────────────────────────────
  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Cover image must be 5MB or less.");
      return;
    }

    setUploadingImage(true);
    try {
      const webpBlob = await compressImageToWebP(file, {
        maxDimension: COVER_MAX_DIMENSION,
        quality: COVER_QUALITY,
      });
      // Unique path per upload so a new cover never fights the CDN cache of
      // the old one; the previous object is removed on replace below.
      const path = `covers/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(BLOG_IMAGE_BUCKET)
        .upload(path, webpBlob, {
          contentType: "image/webp",
          cacheControl: "31536000",
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);

      await removeStoredCover(form.coverImageUrl); // replaced image, best-effort
      setField("coverImageUrl", publicUrl);
      toast.success("Cover image uploaded.");
    } catch (err) {
      console.error("[BlogManagement] cover upload error:", err.message);
      toast.error("Could not upload the cover image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Best-effort delete of an old cover object when it lives in our bucket.
  const removeStoredCover = async (url) => {
    const marker = `/object/public/${BLOG_IMAGE_BUCKET}/`;
    const at = (url || "").indexOf(marker);
    if (at === -1) return;
    const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
    const { error } = await supabase.storage
      .from(BLOG_IMAGE_BUCKET)
      .remove([path]);
    if (error) console.warn("[BlogManagement] cover cleanup warning:", error.message);
  };

  const handleImageRemove = async () => {
    await removeStoredCover(form.coverImageUrl);
    setField("coverImageUrl", "");
  };

  // ── Save / publish / delete ──────────────────────────────────────────────
  const validate = () => {
    const candidate = formToCandidate(form);
    // Blank reading time means "use the estimate" — resolve before validating.
    if (form.readingTime === "") candidate.readingTime = liveEstimate;
    const result = blogPostSchema.safeParse(candidate);
    if (!result.success) {
      const map = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      toast.error(result.error.issues[0]?.message ?? "Please fix the highlighted fields.");
      return null;
    }
    setErrors({});
    return result.data;
  };

  const buildPayload = (parsed) => ({
    slug: parsed.slug,
    title: parsed.title,
    seo_title: parsed.seoTitle,
    seo_description: parsed.seoDescription,
    intro: parsed.intro,
    cover_image_url: parsed.coverImageUrl,
    tags: parsed.tags,
    reading_time: parsed.readingTime,
    sections: parsed.sections,
    faqs: parsed.faqs,
    status: parsed.status,
    // Stamp the publish date on the first transition to published; keep the
    // original date on later edits so articles don't jump around the index.
    published_at:
      parsed.status === "published"
        ? form.publishedAt ?? new Date().toISOString()
        : form.publishedAt,
  });

  const friendlySaveError = (err) =>
    err?.code === "23505"
      ? "A post with this slug already exists — pick a different slug."
      : "Could not save the post. Please try again.";

  const save = async (statusOverride) => {
    const parsed = validate();
    if (!parsed) return;
    if (statusOverride) parsed.status = statusOverride;

    setSaving(true);
    try {
      const payload = buildPayload(parsed);
      let savedId = form.id;

      if (form.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("blog_posts")
          .insert({ ...payload, created_by: user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      logActivity(user?.id, form.id ? "admin_blog_post_updated" : "admin_blog_post_created", {
        id: savedId,
        slug: parsed.slug,
        status: parsed.status,
      });
      toast.success(
        parsed.status === "published" ? "Post published." : "Draft saved."
      );
      await load();
      setView("list");
    } catch (err) {
      console.error("[BlogManagement] save error:", err.message);
      toast.error(friendlySaveError(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (row) => {
    const nextStatus = row.status === "published" ? "draft" : "published";
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: nextStatus,
          published_at:
            nextStatus === "published"
              ? row.published_at ?? new Date().toISOString()
              : row.published_at,
        })
        .eq("id", row.id);
      if (error) throw error;
      logActivity(user?.id, "admin_blog_post_status_changed", {
        id: row.id,
        slug: row.slug,
        status: nextStatus,
      });
      toast.success(nextStatus === "published" ? "Post published." : "Post unpublished.");
      await load();
    } catch (err) {
      console.error("[BlogManagement] publish toggle error:", err.message);
      toast.error("Could not change the post status. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const deletePost = async (row) => {
    const confirmed = window.confirm(
      `Delete "${row.title}"? This removes it from the public blog permanently.`
    );
    if (!confirmed) return;

    setBusyId(row.id);
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", row.id);
      if (error) throw error;
      await removeStoredCover(row.cover_image_url);
      logActivity(user?.id, "admin_blog_post_deleted", { id: row.id, slug: row.slug });
      toast.success("Post deleted.");
      await load();
    } catch (err) {
      console.error("[BlogManagement] delete error:", err.message);
      toast.error("Could not delete the post. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-16"
        data-testid="admin-blog-loading-spinner"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const header = (
    <div className="flex items-start gap-3">
      <Newspaper className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Blog Posts
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Write, edit, and publish articles on the public blog — no code changes
          needed. Drafts stay hidden until you publish them.
        </p>
      </div>
    </div>
  );

  const migrationNotice = tableMissing && (
    <div
      className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300 flex items-start gap-2"
      data-testid="admin-blog-table-missing"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        Blog management needs migration{" "}
        <code className="text-[12px]">034_blog_posts.sql</code> applied to the
        database before posts can be created.
      </span>
    </div>
  );

  if (view === "editor") {
    return (
      <div className="space-y-6" data-testid="admin-blog-editor">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={backToList}
            data-testid="admin-blog-editor-back-btn"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            All posts
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || uploadingImage}
              onClick={() => save("draft")}
              data-testid="admin-blog-save-draft-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save draft
            </button>
            <button
              type="button"
              disabled={saving || uploadingImage}
              onClick={() => save("published")}
              data-testid="admin-blog-publish-btn"
              className="btn-gradient inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {form.status === "published" ? "Update & publish" : "Publish"}
            </button>
          </div>
        </div>

        <form
          data-testid="admin-blog-post-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6"
        >
          {/* Basics */}
          <div className="card p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Basics
            </h4>
            <div>
              <FieldLabel htmlFor="blog-title">Title</FieldLabel>
              <input
                id="blog-title"
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Five Habits of Consistently Profitable Traders"
                data-testid="admin-blog-title-input"
                className="input w-full"
              />
              <FieldError id="admin-blog-title-error" message={errors.title} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="blog-slug" hint="the URL: /blog/your-slug">
                  Slug
                </FieldLabel>
                <input
                  id="blog-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    // Light normalization while typing (full slugify would eat
                    // the trailing hyphen mid-word); Zod validates on save.
                    setField(
                      "slug",
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-")
                    )
                  }
                  placeholder="five-habits-of-profitable-traders"
                  data-testid="admin-blog-slug-input"
                  className="input w-full font-mono text-sm"
                />
                <FieldError id="admin-blog-slug-error" message={errors.slug} />
              </div>
              <div>
                <FieldLabel
                  htmlFor="blog-reading-time"
                  hint={`blank = auto (${liveEstimate} min)`}
                >
                  Reading time (minutes)
                </FieldLabel>
                <input
                  id="blog-reading-time"
                  type="number"
                  min="1"
                  max="120"
                  value={form.readingTime}
                  onChange={(e) => setField("readingTime", e.target.value)}
                  placeholder={String(liveEstimate)}
                  data-testid="admin-blog-reading-time-input"
                  className="input w-full"
                />
                <FieldError
                  id="admin-blog-reading-time-error"
                  message={errors.readingTime}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="blog-tags" hint="comma-separated, max 8">
                Tags
              </FieldLabel>
              <input
                id="blog-tags"
                type="text"
                value={form.tagsText}
                onChange={(e) => setField("tagsText", e.target.value)}
                placeholder="Journaling, Psychology, Beginners"
                data-testid="admin-blog-tags-input"
                className="input w-full"
              />
              <FieldError id="admin-blog-tags-error" message={errors.tags} />
            </div>
            <div>
              <FieldLabel
                htmlFor="blog-intro"
                hint="shown under the title and used as the article summary"
              >
                Intro
              </FieldLabel>
              <textarea
                id="blog-intro"
                rows={4}
                value={form.intro}
                onChange={(e) => setField("intro", e.target.value)}
                placeholder="Open with the problem this article solves for the reader…"
                data-testid="admin-blog-intro-input"
                className="input w-full"
              />
              <FieldError id="admin-blog-intro-error" message={errors.intro} />
            </div>
          </div>

          {/* Cover image */}
          <div className="card p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cover image
            </h4>
            {form.coverImageUrl ? (
              <div className="relative w-full max-w-md">
                <img
                  src={form.coverImageUrl}
                  alt="Cover preview"
                  data-testid="admin-blog-cover-preview-img"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-cover aspect-video"
                />
                <button
                  type="button"
                  onClick={handleImageRemove}
                  disabled={uploadingImage}
                  data-testid="admin-blog-cover-remove-btn"
                  aria-label="Remove cover image"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-danger-500 hover:bg-danger-600 text-white flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                data-testid="admin-blog-cover-upload-btn"
                className="w-full max-w-md aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    data-testid="admin-blog-cover-uploading-spinner"
                  />
                ) : (
                  <ImagePlus className="w-8 h-8" />
                )}
                <span className="text-sm font-medium">
                  {uploadingImage ? "Uploading…" : "Upload cover image"}
                </span>
                <span className="text-xs">JPG, PNG or WebP · max 5MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              data-testid="admin-blog-cover-file-input"
            />
          </div>

          {/* Content sections */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Content sections
              </h4>
              <button
                type="button"
                onClick={addSection}
                data-testid="admin-blog-add-section-btn"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add section
              </button>
            </div>
            <FieldError id="admin-blog-sections-error" message={errors.sections} />
            {form.sections.map((section, index) => (
              <div
                key={index}
                data-testid={`admin-blog-section-${index}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                    Section {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      data-testid={`admin-blog-section-up-btn-${index}`}
                      aria-label={`Move section ${index + 1} up`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === form.sections.length - 1}
                      data-testid={`admin-blog-section-down-btn-${index}`}
                      aria-label={`Move section ${index + 1} down`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      disabled={form.sections.length === 1}
                      data-testid={`admin-blog-section-remove-btn-${index}`}
                      aria-label={`Remove section ${index + 1}`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor={`blog-section-heading-${index}`}>
                    Heading
                  </FieldLabel>
                  <input
                    id={`blog-section-heading-${index}`}
                    type="text"
                    value={section.heading}
                    onChange={(e) => updateSection(index, { heading: e.target.value })}
                    placeholder="e.g. Why most trading journals fail"
                    data-testid={`admin-blog-section-heading-input-${index}`}
                    className="input w-full"
                  />
                  <FieldError
                    id={`admin-blog-section-heading-error-${index}`}
                    message={errors[`sections.${index}.heading`]}
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor={`blog-section-body-${index}`}
                    hint="separate paragraphs with a blank line"
                  >
                    Paragraphs
                  </FieldLabel>
                  <textarea
                    id={`blog-section-body-${index}`}
                    rows={6}
                    value={section.paragraphsText}
                    onChange={(e) =>
                      updateSection(index, { paragraphsText: e.target.value })
                    }
                    placeholder={"First paragraph…\n\nSecond paragraph…"}
                    data-testid={`admin-blog-section-body-input-${index}`}
                    className="input w-full"
                  />
                  <FieldError
                    id={`admin-blog-section-body-error-${index}`}
                    message={errors[`sections.${index}.paragraphs`]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* FAQs */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                FAQs
                <span className="ml-2 normal-case font-normal text-xs text-gray-400 dark:text-gray-500">
                  optional — also emitted as FAQ structured data for search engines
                </span>
              </h4>
              <button
                type="button"
                onClick={addFaq}
                data-testid="admin-blog-add-faq-btn"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add FAQ
              </button>
            </div>
            {form.faqs.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No FAQs yet.
              </p>
            )}
            {form.faqs.map((faq, index) => (
              <div
                key={index}
                data-testid={`admin-blog-faq-${index}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                    FAQ {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    data-testid={`admin-blog-faq-remove-btn-${index}`}
                    aria-label={`Remove FAQ ${index + 1}`}
                    className="p-1.5 rounded-md text-gray-400 hover:text-danger-600 dark:hover:text-danger-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <FieldLabel htmlFor={`blog-faq-question-${index}`}>
                    Question
                  </FieldLabel>
                  <input
                    id={`blog-faq-question-${index}`}
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(index, { question: e.target.value })}
                    data-testid={`admin-blog-faq-question-input-${index}`}
                    className="input w-full"
                  />
                  <FieldError
                    id={`admin-blog-faq-question-error-${index}`}
                    message={errors[`faqs.${index}.question`]}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`blog-faq-answer-${index}`}>Answer</FieldLabel>
                  <textarea
                    id={`blog-faq-answer-${index}`}
                    rows={3}
                    value={faq.answer}
                    onChange={(e) => updateFaq(index, { answer: e.target.value })}
                    data-testid={`admin-blog-faq-answer-input-${index}`}
                    className="input w-full"
                  />
                  <FieldError
                    id={`admin-blog-faq-answer-error-${index}`}
                    message={errors[`faqs.${index}.answer`]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* SEO */}
          <div className="card p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              SEO
            </h4>
            <div>
              <FieldLabel htmlFor="blog-seo-title" hint="blank = use the post title">
                Search title
              </FieldLabel>
              <input
                id="blog-seo-title"
                type="text"
                value={form.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
                data-testid="admin-blog-seo-title-input"
                className="input w-full"
              />
              <FieldError id="admin-blog-seo-title-error" message={errors.seoTitle} />
            </div>
            <div>
              <FieldLabel
                htmlFor="blog-seo-description"
                hint="the snippet under the title in search results (max 320 chars)"
              >
                Search description
              </FieldLabel>
              <textarea
                id="blog-seo-description"
                rows={2}
                value={form.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
                data-testid="admin-blog-seo-description-input"
                className="input w-full"
              />
              <FieldError
                id="admin-blog-seo-description-error"
                message={errors.seoDescription}
              />
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-blog-management">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {header}
        <button
          type="button"
          onClick={openNew}
          disabled={tableMissing}
          data-testid="admin-blog-new-post-btn"
          className="btn-gradient inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          New post
        </button>
      </div>

      {migrationNotice}

      {!tableMissing && posts.length === 0 && (
        <div
          className="card p-10 text-center text-gray-500 dark:text-gray-400"
          data-testid="admin-blog-empty-state"
        >
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">
            Click “New post” to write your first article for the public blog.
          </p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="card overflow-x-auto p-0" data-testid="admin-blog-post-list">
          <table className="min-w-[720px] w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Post
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {posts.map((post) => (
                <tr key={post.id} data-testid={`admin-blog-post-row-${post.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt=""
                          className="w-14 h-9 rounded-md object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-14 h-9 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Newspaper className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                          {post.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs">
                          /blog/{post.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-nums">
                    {post.published_at ? formatLongDate(post.published_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "published" && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`admin-blog-view-btn-${post.id}`}
                          aria-label={`View ${post.title} on the site`}
                          title="View on site"
                          className="p-2 rounded-md text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePublish(post)}
                        disabled={busyId === post.id}
                        data-testid={`admin-blog-toggle-publish-btn-${post.id}`}
                        title={post.status === "published" ? "Unpublish" : "Publish"}
                        className="p-2 rounded-md text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-40"
                      >
                        {busyId === post.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : post.status === "published" ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        data-testid={`admin-blog-edit-btn-${post.id}`}
                        title="Edit"
                        className="p-2 rounded-md text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post)}
                        disabled={busyId === post.id}
                        data-testid={`admin-blog-delete-btn-${post.id}`}
                        title="Delete"
                        className="p-2 rounded-md text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
