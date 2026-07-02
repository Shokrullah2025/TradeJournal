import React from "react";
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../../components/site/DetailPageTemplate";
import { getFeaturePage } from "../../components/site/detailPages";

/**
 * Feature detail page (route "/features/:slug"). Looks the slug up in the
 * shared content module; unknown slugs redirect to the features index so old
 * or mistyped links never dead-end on a broken page.
 */
const FeatureDetail = () => {
  const { slug } = useParams();
  const page = getFeaturePage(slug);

  if (!page) return <Navigate to="/features" replace />;

  return <DetailPageTemplate page={page} basePath="/features" />;
};

export default FeatureDetail;
