import { createContext, useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ── Demo context ──────────────────────────────────────────────
interface DemoCtx { openDemo: () => void }
const DemoContext = createContext<DemoCtx>({ openDemo: () => {} });
export const useDemo = () => useContext(DemoContext);

// ── Shared helpers ────────────────────────────────────────────
const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

/** Primary (filled) button */
export function BtnPrimary({
  children,
  onClick,
  size = 'md',
  type = 'button',
  style: extraStyle,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  const h = size === 'sm' ? '2.25rem' : '2.75rem';
  const px = size === 'sm' ? '1rem' : '1.5rem';
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.375rem', height: h, padding: `0 ${px}`,
        borderRadius: 'var(--radius-button)', background: 'var(--accent)',
        color: '#fff', fontFamily: 'inherit', fontSize: size === 'sm' ? '0.875rem' : '0.9375rem',
        fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background 150ms var(--ease-standard)',
        textDecoration: 'none',
        ...extraStyle,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
    >
      {children}
    </button>
  );
}

/** Secondary (outline) button */
export function BtnSecondary({
  children,
  onClick,
  size = 'md',
  type = 'button',
  style: extraStyle,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'icon';
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  const h = size === 'sm' ? '2.25rem' : '2.75rem';
  const px = size === 'icon' ? '0' : size === 'sm' ? '1rem' : '1.5rem';
  const w = size === 'icon' ? '2.5rem' : undefined;
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.375rem', height: h, width: w, padding: `0 ${px}`,
        borderRadius: 'var(--radius-button)', background: 'transparent',
        color: 'var(--text-primary)', fontFamily: 'inherit',
        fontSize: size === 'sm' ? '0.875rem' : '0.9375rem',
        fontWeight: 600, border: '1px solid var(--border-strong)',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background 150ms var(--ease-standard)',
        textDecoration: 'none',
        ...extraStyle,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-ink-5)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

/** Alternate (white fill) — for dark / image backgrounds */
export function BtnAlternate({
  children,
  onClick,
  size = 'md',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
}) {
  const h = size === 'sm' ? '2.25rem' : '2.75rem';
  const px = size === 'sm' ? '1rem' : '1.5rem';
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.375rem', height: h, padding: `0 ${px}`,
        borderRadius: 'var(--radius-button)', background: '#fff',
        color: 'var(--text-primary)', fontFamily: 'inherit',
        fontSize: size === 'sm' ? '0.875rem' : '0.9375rem',
        fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'opacity 150ms var(--ease-standard)',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

/** Secondary-alt — outline on dark backgrounds */
export function BtnSecondaryAlt({
  children,
  onClick,
  size = 'md',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const h = size === 'sm' ? '2.25rem' : '2.75rem';
  const px = size === 'sm' ? '1rem' : '1.5rem';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.375rem', height: h, padding: `0 ${px}`,
        borderRadius: 'var(--radius-button)', background: 'transparent',
        color: '#fff', fontFamily: 'inherit',
        fontSize: size === 'sm' ? '0.875rem' : '0.9375rem',
        fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background 150ms var(--ease-standard)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

/** Avatar initials circle */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const sz = size === 'lg' ? 56 : size === 'md' ? 48 : 36;
  const fs = size === 'md' ? '0.9rem' : '0.8rem';
  return (
    <div style={{
      width: sz, height: sz, borderRadius: '50%',
      background: 'var(--accent-subtle)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: fs, fontFamily: 'var(--font-heading)', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/** Accordion component */
export function Accordion({ items }: { items: { title: string; content: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '1rem',
              padding: '1.15rem 0', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 500,
              fontSize: '1.05rem', color: 'var(--text-primary)', textAlign: 'left',
            }}
          >
            <span>{item.title}</span>
            <img
              src={MS(open === i ? 'keyboard_arrow_up' : 'keyboard_arrow_down')}
              width={20} alt=""
              style={{ flexShrink: 0, opacity: 0.6, transition: 'transform 200ms' }}
            />
          </button>
          {open === i && (
            <div style={{
              color: 'var(--text-secondary)', lineHeight: 1.65,
              fontSize: '0.9875rem', paddingBottom: '1.15rem',
            }}>
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** ImageCard — background image with dark overlay */
export function ImageCard({
  image,
  children,
  minHeight = 300,
}: {
  image: string;
  children: React.ReactNode;
  minHeight?: number;
}) {
  return (
    <div style={{
      position: 'relative', borderRadius: 'var(--radius-image)',
      overflow: 'hidden', minHeight,
    }}>
      <img
        src={image}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim)' }} />
      <div style={{ position: 'relative', padding: '1.85rem', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── Demo Modal ────────────────────────────────────────────────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--scrim)',
        animation: 'stFade 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: '#fff',
          borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
          animation: 'stRise 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h5)', margin: 0 }}>Request a demo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.4rem 0 0' }}>See Commonplace convert your notes in a 30-minute walkthrough.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', background: 'transparent',
              borderRadius: 'var(--radius-button)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-ink-5)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <img src={MS('close')} width={22} alt="Close" />
          </button>
        </div>

        {!sent ? (
          <form
            onSubmit={e => { e.preventDefault(); setSent(true); }}
            style={{ display: 'grid', gap: '1.1rem', marginTop: '1.75rem' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Work email</label>
              <input type="email" required placeholder="you@company.com" className="st-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Company</label>
              <input type="text" required placeholder="Acme Operations" className="st-input" />
            </div>
            <div style={{ marginTop: '0.25rem' }}>
              <BtnPrimary type="submit" style={{ height: '2.75rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>Request demo</BtnPrimary>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: '1.75rem', textAlign: 'center', padding: '1rem 0' }}>
            <img
              src={MS('check_circle')}
              width={48} alt=""
              style={{ filter: 'brightness(0) saturate(100%) invert(48%) sepia(58%) saturate(560%) hue-rotate(72deg)' }}
            />
            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h6)', margin: '1rem 0 0' }}>Request received</h4>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Our team will reach out within one business day.</p>
            <BtnSecondary onClick={onClose}>Done</BtnSecondary>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Marketing Nav ─────────────────────────────────────────────
function MarketingNav({ openDemo }: { openDemo: () => void }) {
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <Link
        to={to}
        style={{
          textDecoration: 'none',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: active ? 600 : 400,
          fontSize: '0.95rem',
          transition: 'color 150ms',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        width: '100%', maxWidth: '80rem', margin: '0 auto',
        padding: '0 5%', height: '72px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1.5rem',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <img src="/assets/commonplace-light.svg" alt="Commonplace" height={26} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>Commonplace</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2.25rem' }}>
          {navLink('/how-it-works', 'How it works')}
          {navLink('/use-cases', 'Use cases')}
          {navLink('/pricing', 'Pricing')}
          <Link
            to="/#faq"
            style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.95rem' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
          >
            Resources <img src={MS('keyboard_arrow_down')} width={18} alt="" />
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', height: '2.25rem',
              padding: '0 1rem', borderRadius: 'var(--radius-button)',
              background: 'transparent', color: 'var(--text-primary)',
              fontSize: '0.875rem', fontWeight: 600,
              border: '1px solid var(--border-strong)', textDecoration: 'none',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-ink-5)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            Sign in
          </Link>
          <button
            onClick={openDemo}
            style={{
              display: 'inline-flex', alignItems: 'center', height: '2.25rem',
              padding: '0 1rem', borderRadius: 'var(--radius-button)',
              background: 'var(--accent)', color: '#fff',
              fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Demo
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Marketing Footer ──────────────────────────────────────────
function MarketingFooter() {
  const [newsSent, setNewsSent] = useState(false);
  const footerLink = (label: string, to: string) => (
    <li key={label}>
      <Link
        to={to}
        style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.78)')}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <footer style={{ background: 'var(--surface-inverse)', color: 'rgba(255,255,255,0.7)', padding: 'clamp(3.5rem,6vw,5rem) 0 2.5rem' }}>
      <div style={{ width: '100%', maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.4fr', gap: '2.5rem' }}>
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#fff' }}>
              <img src="/assets/commonplace-dark.svg" alt="Commonplace" height={26} />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Commonplace</span>
            </Link>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1rem' }}>Product</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem' }}>
              {footerLink('How it works', '/how-it-works')}
              {footerLink('Use cases', '/use-cases')}
              {footerLink('Pricing', '/pricing')}
              {footerLink('Security', '/security')}
              {footerLink('Resources', '/#faq')}
            </ul>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1rem' }}>Company</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem' }}>
              {footerLink('Request demo', '/demo')}
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Documentation</a></li>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Blog</a></li>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Support</a></li>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1rem' }}>Legal</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem' }}>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Privacy policy</a></li>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Terms of service</a></li>
              {footerLink('Compliance', '/security#compliance')}
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Status page</a></li>
              <li><a href="#" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', fontSize: '0.95rem' }}>Updates</a></li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1rem' }}>Newsletter</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1rem', lineHeight: 1.5 }}>Get the latest on product releases and feature updates.</p>
            <form onSubmit={e => { e.preventDefault(); setNewsSent(true); }} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="email" required placeholder="Enter your email"
                style={{
                  flex: 1, minWidth: 160, height: 40, padding: '0 0.85rem',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-white-20)',
                  background: 'var(--color-white-10)',
                  color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <BtnAlternate type="submit" size="sm">Subscribe</BtnAlternate>
            </form>
            {newsSent && (
              <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-apple-light)', margin: '0.85rem 0 0', fontSize: '0.85rem' }}>
                <img src={MS('check_circle')} width={16} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(38%) saturate(560%) hue-rotate(56deg)' }} />
                You're subscribed.
              </p>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-white-20)', margin: '3rem 0 1.75rem' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
            <span>&copy; 2026 Commonplace. All rights reserved.</span>
            <a href="#" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Privacy policy</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Terms of service</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Cookies settings</a>
          </div>
          <div style={{ display: 'flex', gap: '1.1rem' }}>
            {['public', 'forum', 'rss_feed', 'share', 'smart_display'].map(icon => (
              <a key={icon} href="#" style={{ display: 'flex' }}>
                <img src={MS(icon)} width={22} alt="" style={{ filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── MarketingLayout ───────────────────────────────────────────
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);
  const closeDemo = () => setDemoOpen(false);

  return (
    <DemoContext.Provider value={{ openDemo }}>
      <div style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
        background: 'var(--surface-page)',
        minHeight: '100%',
      }}>
        <MarketingNav openDemo={openDemo} />
        {children}
        <MarketingFooter />
        {demoOpen && <DemoModal onClose={closeDemo} />}
      </div>
    </DemoContext.Provider>
  );
}
