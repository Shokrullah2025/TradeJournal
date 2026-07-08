import React from "react";
import { Routes, Route } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import Home from "../pages/site/Home";
import Features from "../pages/site/Features";
import FeatureDetail from "../pages/site/FeatureDetail";
import SolutionDetail from "../pages/site/SolutionDetail";
import Pricing from "../pages/site/Pricing";
import About from "../pages/site/About";
import Contact from "../pages/site/Contact";
import Blog from "../pages/site/Blog";
import BlogPost from "../pages/site/BlogPost";
import NotFound from "../pages/site/NotFound";
import TermsOfService from "../pages/legal/TermsOfService";
import PrivacyPolicy from "../pages/legal/PrivacyPolicy";
import Disclaimer from "../pages/legal/Disclaimer";
import CookiePolicy from "../pages/legal/CookiePolicy";
import RefundPolicy from "../pages/legal/RefundPolicy";
import AcceptableUsePolicy from "../pages/legal/AcceptableUsePolicy";
import DMCAPolicy from "../pages/legal/DMCAPolicy";

/**
 * Build-time (SSR) route table for the public site — the prerender mirror of
 * the SiteLayout group in App.jsx. Pages are imported EAGERLY on purpose:
 * React.lazy suspends, and renderToString cannot wait for lazy chunks. This
 * module is only ever bundled by `vite build --ssr` (see scripts/
 * prerender.mjs); the browser bundle keeps App.jsx's lazy imports.
 *
 * When adding a public route to App.jsx, add it here AND to routes.js, or the
 * new page will ship without prerendered HTML and miss the sitemap.
 */
const SiteRoutes = () => (
  <Routes>
    <Route element={<SiteLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/features" element={<Features />} />
      <Route path="/features/:slug" element={<FeatureDetail />} />
      <Route path="/solutions/:slug" element={<SolutionDetail />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/aup" element={<AcceptableUsePolicy />} />
      <Route path="/dmca" element={<DMCAPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
);

export default SiteRoutes;
