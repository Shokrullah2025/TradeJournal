import React from "react";
import { useParams } from "react-router-dom";
import DetailPageTemplate from "../../components/site/DetailPageTemplate";
import NotFound from "./NotFound";
import { getSolutionPage } from "../../components/site/detailPages";

/**
 * Solution (audience) detail page (route "/solutions/:slug"). Unknown slugs
 * render the 404 page (noindex) rather than a soft-404 redirect.
 */
const SolutionDetail = () => {
  const { slug } = useParams();
  const page = getSolutionPage(slug);

  if (!page) return <NotFound />;

  return <DetailPageTemplate page={page} basePath="/solutions" />;
};

export default SolutionDetail;
