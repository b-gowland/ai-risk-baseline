import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import About from './pages/About.jsx'
import Disclaimer from './pages/Disclaimer.jsx'
import Changelog from './pages/Changelog.jsx'
import Examples from './pages/Examples.jsx'
import NotFound from './pages/NotFound.jsx'
// The questionnaire and output pages load on demand, keeping the landing page light
const ConfigureV2 = lazy(() => import('./v2/ui/pages/ConfigureV2.jsx'))
const OutputV2 = lazy(() => import('./v2/ui/pages/OutputV2.jsx'))

// Keep links from the v2 preview period (/v2/configure, /v2/output) working.
function KeepQuery({ to }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

// Keeps old links of the form /?redirect=%2Fabout working. They were made by
// the GitHub Pages 404.html trick used before the move to Cloudflare Pages
// (17 Nov 2026). Cloudflare now serves each route directly (public/_redirects)
// and a real 404 for anything else (public/404.html).
//
// We navigate client-side, with no reload. The redirect param must be a
// same-origin path: it must start with a single '/'. Absolute URLs
// (https://evil.example), protocol-relative ones (//evil.example), javascript:
// URIs and anything else that could make an open redirect are dropped.
function RedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (!redirect) return;
    // Same-origin path only: must start with single '/' and not '//'.
    const safe = redirect.startsWith('/') && !redirect.startsWith('//');
    if (!safe) {
      // Drop the redirect param and stay on /. Don't honour adversarial input.
      navigate('/', { replace: true });
      return;
    }
    params.delete('redirect');
    const query = params.toString();
    const target = redirect + (query ? (redirect.includes('?') ? '&' : '?') + query : '');
    navigate(target, { replace: true });
  }, [navigate]);
  return null;
}

// Point the canonical link at the page being shown, without the query string
// (on /output the query holds the user's answers).
const SITE = `https://baseline.airiskpractice.org`
function Canonical() {
  const { pathname } = useLocation()
  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]')
    if (link) link.setAttribute(`href`, SITE + pathname)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <RedirectHandler />
      <Canonical />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Nav />
        <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/configure" element={<Suspense fallback={null}><ConfigureV2 /></Suspense>} />
            <Route path="/output" element={<Suspense fallback={null}><OutputV2 /></Suspense>} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/about" element={<About />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/v2/configure" element={<KeepQuery to="/configure" />} />
            <Route path="/v2/output" element={<KeepQuery to="/output" />} />
            {/* Retired v1 routes */}
            <Route path="/output/drill/:name" element={<Navigate to="/configure" replace />} />
            <Route path="/example" element={<Navigate to="/examples" replace />} />
            {/* Every route above needs a line in public/_redirects. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
