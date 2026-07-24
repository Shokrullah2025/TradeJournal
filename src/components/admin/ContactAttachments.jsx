import React from "react";
import PropTypes from "prop-types";
import {
  FileText,
  FileArchive,
  File,
  ImageOff,
  Paperclip,
  Download,
  ExternalLink,
} from "lucide-react";

// Where the untouched original email — every attachment included — can always
// be found. Resend keeps received mail for 30 days.
const RESEND_INBOX_URL = "https://resend.com/emails";

// Files attached to an inbound contact message (contact-inbound stores them in
// the private contact-attachments bucket and records them on
// metadata.attachments). Images render as previews; everything else — PDFs,
// documents, archives — renders as a labelled download chip.
//
// `urls` maps a storage path to a short-lived signed URL. A path that isn't in
// the map yet (still being signed, or the signing call failed) renders as a
// disabled tile rather than a broken image.

const IMAGE_TYPES = /^image\//i;

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const iconFor = (contentType) => {
  if (contentType === "application/pdf") return FileText;
  if (contentType === "application/zip") return FileArchive;
  if (contentType?.startsWith("text/")) return FileText;
  return File;
};

// Why a file was left behind, in the sender's terms — the admin may need to ask
// for it another way.
const SKIP_REASONS = {
  type: "file type isn't supported",
  size: "file was too large",
  download: "file couldn't be downloaded",
  upload: "file couldn't be saved",
};

function ContactAttachments({
  attachments = [],
  skipped = [],
  truncated = 0,
  urls = {},
  testIdPrefix,
}) {
  const files = Array.isArray(attachments) ? attachments : [];
  const blocked = Array.isArray(skipped) ? skipped : [];
  // The email carried more files than we store, so some were never fetched.
  const overflow = Number(truncated) > files.length ? Number(truncated) : 0;
  if (files.length === 0 && blocked.length === 0 && overflow === 0) return null;

  const images = files.filter((f) => IMAGE_TYPES.test(f.contentType ?? ""));
  const others = files.filter((f) => !IMAGE_TYPES.test(f.contentType ?? ""));

  return (
    <div data-test-id={`${testIdPrefix}-attachments`} className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Paperclip className="h-3.5 w-3.5" />
        {files.length > 0
          ? `${files.length} ${files.length === 1 ? "attachment" : "attachments"}`
          : "Attachments"}
      </p>

      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((file) => {
            const url = urls[file.path];
            return url ? (
              <a
                key={file.path}
                data-test-id={`${testIdPrefix}-attachment-image-${file.path}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${file.filename}${formatSize(file.size) ? ` · ${formatSize(file.size)}` : ""}`}
                className="block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-primary-400"
              >
                <img
                  src={url}
                  alt={file.filename}
                  loading="lazy"
                  className="h-24 w-24 object-cover sm:h-28 sm:w-28"
                />
              </a>
            ) : (
              <div
                key={file.path}
                data-test-id={`${testIdPrefix}-attachment-pending-${file.path}`}
                title={file.filename}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 sm:h-28 sm:w-28"
              >
                <ImageOff className="h-5 w-5" />
                <span className="px-1 text-center text-[10px] leading-tight">Preview unavailable</span>
              </div>
            );
          })}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {others.map((file) => {
            const Icon = iconFor(file.contentType);
            const url = urls[file.path];
            const size = formatSize(file.size);
            const label = (
              <>
                <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                {size && <span className="shrink-0 text-xs text-gray-400">{size}</span>}
              </>
            );
            return url ? (
              <a
                key={file.path}
                data-test-id={`${testIdPrefix}-attachment-file-${file.path}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
              >
                {label}
                <Download className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </a>
            ) : (
              <div
                key={file.path}
                data-test-id={`${testIdPrefix}-attachment-pending-${file.path}`}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm text-gray-400"
              >
                {label}
              </div>
            );
          })}
        </div>
      )}

      {/* Anything we couldn't keep — too many files, or one we refused. The
          sender's original is still on Resend for 30 days, so point there
          rather than leaving the admin with a dead end. */}
      {(blocked.length > 0 || overflow > 0) && (
        <div
          data-test-id={`${testIdPrefix}-attachments-skipped`}
          className="mt-2 rounded-lg bg-warning-50 dark:bg-warning-900/15 px-2.5 py-2 text-xs text-warning-800 dark:text-warning-300"
        >
          {overflow > 0 && (
            <p>
              This email had <strong>{overflow} files</strong> — the first{" "}
              {files.length} are here.
            </p>
          )}
          {blocked.length > 0 && (
            <p className={overflow > 0 ? "mt-1" : undefined}>
              {blocked.length === 1
                ? `“${blocked[0].filename}” wasn't saved — the ${
                    SKIP_REASONS[blocked[0].reason] ?? "file couldn't be saved"
                  }.`
                : `${blocked.length} files weren't saved (unsupported type or too large).`}
            </p>
          )}
          <a
            data-test-id={`${testIdPrefix}-attachments-resend-link`}
            href={RESEND_INBOX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-warning-900 dark:hover:text-warning-200"
          >
            Open the full email in the Resend dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

ContactAttachments.propTypes = {
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      filename: PropTypes.string,
      contentType: PropTypes.string,
      size: PropTypes.number,
    }),
  ),
  skipped: PropTypes.arrayOf(
    PropTypes.shape({
      filename: PropTypes.string,
      reason: PropTypes.string,
    }),
  ),
  // Total files on the original email, when it carried more than we store.
  truncated: PropTypes.number,
  urls: PropTypes.objectOf(PropTypes.string),
  testIdPrefix: PropTypes.string.isRequired,
};

export default ContactAttachments;
