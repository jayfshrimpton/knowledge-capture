import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Capture from './pages/Capture';
import Library from './pages/Library';
import Templates from './pages/Templates';
import Billing from './pages/Billing';
import ResetPassword from './pages/ResetPassword';
import OrgSettings from './pages/OrgSettings';
import GapDashboard from './pages/GapDashboard';
import Developer from './pages/Developer';
import AcceptInvite from './pages/AcceptInvite';
import HomePage from './pages/marketing/HomePage';
import HowItWorksPage from './pages/marketing/HowItWorksPage';
import PricingPage from './pages/marketing/PricingPage';
import UseCasesPage from './pages/marketing/UseCasesPage';
import SecurityPage from './pages/marketing/SecurityPage';
import RequestDemoPage from './pages/marketing/RequestDemoPage';

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}

function Header() {
  const { me, signOut } = useAuth();
  const { pathname } = useLocation();

  const navLink = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      style={{
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        textDecoration: 'none',
        padding: '0.25rem 0',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: `color var(--duration-fast) var(--ease-standard),
                     border-color var(--duration-fast) var(--ease-standard)`,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
    >
      {label}
    </Link>
  );

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '3.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        {/* Logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link
            to="/"
            style={{
              fontFamily: '"Raleway", sans-serif',
              fontWeight: 600,
              fontSize: '1.125rem',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              flexShrink: 0,
            }}
          >
            Commonplace
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {me?.user?.role !== 'guest' && navLink('/', 'Capture', pathname === '/')}
            {navLink('/library', 'Library', pathname.startsWith('/library'))}
            {me?.user?.role !== 'guest' && navLink('/templates', 'Templates', pathname.startsWith('/templates'))}
            {me?.user?.role === 'admin' && navLink('/billing', 'Billing', pathname.startsWith('/billing'))}
            {me?.user?.role === 'admin' && navLink('/settings', 'Settings', pathname.startsWith('/settings'))}
            {me?.user?.role === 'admin' && navLink('/gaps', 'Gaps', pathname.startsWith('/gaps'))}
            {me?.user?.role !== 'guest' && navLink('/developer', 'Developer', pathname.startsWith('/developer'))}
          </nav>
        </div>

        {/* Right side — org + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {me?.user?.orgName && (
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                maxWidth: '12rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {me.user.orgName}
            </span>
          )}
          <button
            onClick={() => signOut()}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0',
              transition: `color var(--duration-fast) var(--ease-standard)`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { isAuthenticated, me, loading } = useAuth();
  const { pathname } = useLocation();

  // The Supabase password-reset link signs the user in with a temporary
  // recovery session, so it must be reachable regardless of auth/onboarding
  // state — render it before any of the gating below.
  if (pathname === '/auth/reset') {
    return <ResetPassword />;
  }

  if (loading) return <Spinner />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/use-cases" element={<UseCasesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/demo" element={<RequestDemoPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (me && !me.onboarded) {
    return <Onboarding />;
  }

  return (
    <div style={{ minHeight: '100%' }}>
      <Header />
      <main
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        <Routes>
          <Route path="/" element={<Capture />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:id" element={<Library />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<OrgSettings />} />
          <Route path="/gaps" element={<GapDashboard />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </main>
    </div>
  );
}
