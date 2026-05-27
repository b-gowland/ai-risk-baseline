import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import DisclaimerBanner from './components/DisclaimerBanner.jsx'
import Landing from './pages/Landing.jsx'
import Configure from './pages/Configure.jsx'
import Output from './pages/Output.jsx'
import DrillPage from './pages/DrillPage.jsx'
import Example from './pages/Example.jsx'
import About from './pages/About.jsx'
import Disclaimer from './pages/Disclaimer.jsx'
import Changelog from './pages/Changelog.jsx'
import Examples from './pages/Examples.jsx'

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
        <DisclaimerBanner />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/configure" element={<Configure />} />
            <Route path="/output" element={<Output />} />
            {/* Mobile full-screen drill route (Pattern B, <768px) */}
            <Route path="/output/drill/:name" element={<DrillPage />} />
            <Route path="/example" element={<Example />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/about" element={<About />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
