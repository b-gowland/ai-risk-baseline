import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import DisclaimerBanner from './components/DisclaimerBanner.jsx'
import Landing from './pages/Landing.jsx'
import Configure from './pages/Configure.jsx'
import Output from './pages/Output.jsx'
import Example from './pages/Example.jsx'
import About from './pages/About.jsx'
import Disclaimer from './pages/Disclaimer.jsx'

// Handle 404.html redirect for GitHub Pages BrowserRouter
function RedirectHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      // Clean up the redirect param and navigate to the actual route
      params.delete('redirect');
      const newUrl = redirect + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState(null, '', '/ai-risk-baseline' + newUrl);
      window.location.reload();
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/ai-risk-baseline">
      <RedirectHandler />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <DisclaimerBanner />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/configure" element={<Configure />} />
            <Route path="/output" element={<Output />} />
            <Route path="/example" element={<Example />} />
            <Route path="/about" element={<About />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
