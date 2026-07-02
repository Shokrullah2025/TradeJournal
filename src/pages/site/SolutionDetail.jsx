import React from "react";
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../../components/site/DetailPageTemplate";
import { getSolutionPage } from "../../components/site/detailPages";

/**
 * Solution (audience) detail page (route "/solutions/:slug"). Unknown slugs
 * redirect to the features index rather than rendering an empty page.
 */
const SolutionDetail = () => {
  const { slug } = useParams();
  const page = getSolutionPage(slug);

  if (!page) return <Navigate to="/features" replace />;

  return <DetailPageTemplate page={page} basePath="/solutions" />;
};

export default SolutionDetail;
