import React from "react";
import { useParams } from "react-router-dom";
import DetailPageTemplate from "../../components/site/DetailPageTemplate";
import NotFound from "./NotFound";
import { getFeaturePage } from "../../components/site/detailPages";

/**
 * Feature detail page (route "/features/:slug"). Looks the slug up in the
 * shared content module; unknown slugs render the 404 page (noindex) so
 * crawlers drop dead URLs instead of seeing a soft-404 redirect.
 */
const FeatureDetail = () => {
  const { slug } = useParams();
  const page = getFeaturePage(slug);

  if (!page) return <NotFound />;

  return <DetailPageTemplate page={page} basePath="/features" />;
};

export default FeatureDetail;
