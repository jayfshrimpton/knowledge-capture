import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Capture from './pages/Capture';
import Library from './pages/Library';

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center text-slate-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    </div>
  );
}

function Header() {
  const { me, signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium ${
      active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Knowledge Capture
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/" className={linkClass(pathname === '/')}>
              Capture
            </Link>
            <Link to="/library" className={linkClass(pathname.startsWith('/library'))}>
              Library
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">{me?.user?.orgName}</span>
          <button onClick={() => signOut()} className="text-slate-600 hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { session, me, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (me && !me.onboarded) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Capture />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:id" element={<Library />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
