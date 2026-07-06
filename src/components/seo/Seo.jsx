import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  TWITTER_HANDLE,
  absoluteUrl,
  pageTitle,
} from "../../utils/seo";

/**
 * Per-page <head> manager for the public marketing and legal pages. Renders a
 * complete, consistent set of SEO tags — title, description, canonical, Open
 * Graph, Twitter Card — plus optional JSON-LD structured data.
 *
 * Crawlers that execute JavaScript (Googlebot) read these tags after render;
 * the static baseline in index.html covers crawlers that do not. Drop a single
 * <Seo .../> at the top of each public page.
 *
 * @param {string}  [title]        Page title; composed as "Title | ZalorTrade".
 * @param {string}  [description]  Meta description (defaults to the site one).
 * @param {string}  [path]         Route path for the canonical/og:url, e.g. "/pricing".
 * @param {string}  [image]        Social-share image path or absolute URL.
 * @param {string}  [type]         Open Graph type ("website" | "article" | ...).
 * @param {boolean} [noindex]      When true, asks crawlers not to index the page.
 * @param {object|object[]} [jsonLd] One or more JSON-LD schema objects.
 */
const Seo = ({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = null,
}) => {
  const fullTitle = pageTitle(title);
  const canonical = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Open Graph (Facebook, LinkedIn, Slack, Discord) */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Structured data */}
      {schemas.map((schema, index) => (
        <script type="application/ld+json" key={index}>
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

Seo.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  path: PropTypes.string,
  image: PropTypes.string,
  type: PropTypes.string,
  noindex: PropTypes.bool,
  jsonLd: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Seo;
