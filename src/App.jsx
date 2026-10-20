import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import About from './pages/About.jsx'
import Disclaimer from './pages/Disclaimer.jsx'
import Changelog from './pages/Changelog.jsx'
import Examples from './pages/Examples.jsx'
// The questionnaire and output pages load on demand, keeping the landing page light
const ConfigureV2 = lazy(() => import('./v2/ui/pages/ConfigureV2.jsx'))
const OutputV2 = lazy(() => import('./v2/ui/pages/OutputV2.jsx'))

// Keep links from the v2 preview period (/v2/configure, /v2/output) working.
function KeepQuery({ to }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

// Handle 404.html redirect for GitHub Pages BrowserRouter
//
// Sequence on a direct URL hit to a non-root path (e.g. /about):
//   1. GitHub Pages has no file at /about → serves public/404.html
//   2. 404.html does window.location.replace('/?redirect=%2Fabout')
//   3. Browser loads / → React mounts → this handler fires
//   4. We navigate client-side to the requested path. NO window.location.reload()
//      — that would re-fetch the path from the server, get 404.html again, and
//      loop. navigate() updates the URL via the History API and lets <Routes>
//      pick the correct page in the same tick.
//
// Redirect param is validated to start with a single '/' (same-origin only).
// Rejects: absolute URLs (https://evil.com), protocol-relative (//evil.com),
// javascript: URIs, and anything else that could be used as an open-redirect.
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

export default function App() {
  return (
    <BrowserRouter basename="/">
      <RedirectHandler />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1 }}>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
