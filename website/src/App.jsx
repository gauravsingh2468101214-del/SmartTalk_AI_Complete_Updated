import { Routes, Route, useLocation, Link } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import FloatingContact from './components/FloatingContact.jsx'
import SmartTalkChat from './components/SmartTalkChat.jsx'
import PageHero from './components/PageHero.jsx'
import Preloader from './components/Preloader.jsx'
import Chrome from './components/Chrome.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import Consent from './components/Consent.jsx'
import CtaBand from './components/CtaBand.jsx'
import { products, industries } from './data.js'

// Route-level code splitting keeps the initial bundle focused on the shared shell.
const Home = lazy(() => import('./pages/Home.jsx'))
const Detail = lazy(() => import('./pages/Detail.jsx'))
const DetailList = lazy(() => import('./pages/Detail.jsx').then(m => ({ default: m.default.List })))
const Blog = lazy(() => import('./pages/Blog.jsx').then(m => ({ default: m.Blog })))
const BlogPost = lazy(() => import('./pages/Blog.jsx').then(m => ({ default: m.BlogPost })))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Calculator = lazy(() => import('./pages/Calculator.jsx'))
const Legal = lazy(() => import('./pages/Legal.jsx'))
const Support = lazy(() => import('./pages/Support.jsx'))
const Visualizer = lazy(() => import('./pages/Visualizer.jsx'))
const Finder = lazy(() => import('./pages/Finder.jsx'))
const Compare = lazy(() => import('./pages/Compare.jsx'))
const Glossary = lazy(() => import('./pages/Glossary.jsx'))
const Projects = lazy(() => import('./pages/Projects.jsx'))
const QuotePlanner = lazy(() => import('./pages/QuotePlanner.jsx'))
const Styleguide = lazy(() => import('./pages/Styleguide.jsx'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
const RouteFallback = () => <div className="wrap flex min-h-[50vh] items-center justify-center"><div className="w-full max-w-xl space-y-4"><div className="h-3 w-28 animate-pulse rounded bg-saffron/30"/><div className="h-10 w-3/4 animate-pulse rounded bg-white/10"/><div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]"/></div></div>
const NotFound = () => (
  <PageHero eyebrow="404" title="This screen is dark."><Link className="btn btn-primary mt-8" to="/">Back to home</Link></PageHero>
)

export default function App() {
  const { pathname } = useLocation()
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:p-3 focus:text-ink">Skip to content</a>
      <Preloader />
      <Chrome />
      <ScrollTop />
      <Header />
      <main id="main">
        <ErrorBoundary><div key={pathname} className="page-in">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<DetailList items={products} title="Our Products" sub="LED and LCD displays for indoor, outdoor and special installations." base="/products" />} />
          <Route path="/products/:slug" element={<Detail items={products} base="/products" />} />
          <Route path="/services" element={<DetailList items={industries} title="Solutions by Industry" sub="Display solutions shaped around how each industry works." base="/services" />} />
          <Route path="/services/:slug" element={<Detail items={industries} base="/services" />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/support" element={<Support />} />
          <Route path="/visualizer" element={<Visualizer />} />
          <Route path="/finder" element={<Finder />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/quote-planner" element={<QuotePlanner />} />
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </div></ErrorBoundary>
      </main>
      {!['/', '/contact'].includes(pathname) && <CtaBand />}
      <Footer />
      <CommandPalette />
      <Consent />
      <FloatingContact />
      <SmartTalkChat />
    </>
  )
}
