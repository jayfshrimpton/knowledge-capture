import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { getBillingStatus, createCheckoutSession, getBillingPortalUrl, BillingStatus } from '../lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:    { label: 'Active',    bg: 'var(--status-success-subtle)', color: 'var(--status-success)' },
    trialing:  { label: 'Trial',     bg: 'var(--accent-subtle)',          color: 'var(--accent)' },
    past_due:  { label: 'Past due',  bg: 'var(--status-warning-subtle)', color: 'var(--status-warning)' },
    cancelled: { label: 'Cancelled', bg: 'var(--surface-subtle)',         color: 'var(--text-muted)' },
    trial:     { label: 'Trial',     bg: 'var(--accent-subtle)',          color: 'var(--accent)' },
  };
  const s = map[status] ?? map.trial;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: 'var(--radius-pill)',
      fontSize: '0.8rem',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  );
}

function PlanLabel({ plan }: { plan: string }) {
  const labels: Record<string, string> = {
    starter:    'Starter',
    business:   'Business',
    enterprise: 'Enterprise',
    trial:      'Trial',
  };
  return <>{labels[plan] ?? plan}</>;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Pricing comparison table (shown when on trial / no paid plan)
// ---------------------------------------------------------------------------

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

function CheckCell({ on }: { on: boolean }) {
  if (on) return (
    <img src={MS('check_circle')} width={18} alt="Included"
      style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)', display: 'block', margin: '0 auto' }} />
  );
  return (
    <img src={MS('remove')} width={18} alt="Not included"
      style={{ opacity: 0.25, display: 'block', margin: '0 auto' }} />
  );
}

const compareRows = [
  { label: 'Price (AUD)',         starter: '$60 /seat/month',   business: '$650 /month flat' },
  { label: 'Minimum seats',       starter: '3 seats',            business: 'Up to 50 users' },
  { label: 'Floating licence',    starter: true,                 business: true },
  { label: 'All document types',  starter: true,                 business: true },
  { label: 'Word & PDF export',   starter: true,                 business: true },
  { label: 'Version history',     starter: true,                 business: true },
  { label: 'Priority support',    starter: false,                business: true },
  { label: 'Custom templates',    starter: false,                business: true },
  { label: 'Audit trails',        starter: false,                business: true },
  { label: 'SSO (Entra ID)',      starter: false,                business: true },
];

interface PricingTableProps {
  onUpgrade: (plan: 'starter' | 'business', seats?: number) => void;
  upgrading: string | null;
}

function PricingTable({ onUpgrade, upgrading }: PricingTableProps) {
  const [starterSeats, setStarterSeats] = useState(3);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 0.375rem', letterSpacing: '-0.015em' }}>
        Choose a plan
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 2rem' }}>
        All plans include a 14-day free trial. No credit card required to start.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Starter card */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '1.75rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.25rem', margin: '0 0 0.375rem' }}>Starter</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Per-seat pricing for smaller teams. Floating licence — only pay for active users.
          </p>
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '2rem', letterSpacing: '-0.02em' }}>$60</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>&nbsp;AUD /seat/month</span>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Minimum 3 seats</div>
          </div>

          {/* Seat selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Number of seats
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setStarterSeats(s => Math.max(3, s - 1))}
                style={{ width: 28, height: 28, borderRadius: 'var(--radius-button)', border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >-</button>
              <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{starterSeats}</span>
              <button
                onClick={() => setStarterSeats(s => s + 1)}
                style={{ width: 28, height: 28, borderRadius: 'var(--radius-button)', border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>= ${starterSeats * 60} AUD/mo</span>
            </div>
          </div>

          <button
            onClick={() => onUpgrade('starter', starterSeats)}
            disabled={upgrading !== null}
            style={{
              width: '100%', height: '2.5rem',
              background: upgrading === 'starter' ? 'var(--accent-hover)' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-button)',
              fontSize: '0.9375rem', fontWeight: 700, cursor: upgrading ? 'default' : 'pointer',
              opacity: upgrading && upgrading !== 'starter' ? 0.6 : 1,
              transition: 'background var(--duration-fast) var(--ease-standard)',
            }}
          >
            {upgrading === 'starter' ? 'Redirecting...' : 'Upgrade to Starter'}
          </button>
        </div>

        {/* Business card */}
        <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius-card)', padding: '1.75rem', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)' }}>
            Most popular
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.25rem', color: '#fff', margin: '0 0 0.375rem' }}>Business</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Flat monthly rate for teams up to 50. Includes SSO, audit trails, and priority support.
          </p>
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '2rem', letterSpacing: '-0.02em', color: '#fff' }}>$650</span>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>&nbsp;AUD /month</span>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Up to 50 users included</div>
          </div>

          <div style={{ height: '3.625rem', marginBottom: '1.25rem' }} /> {/* Spacer to align button with Starter */}

          <button
            onClick={() => onUpgrade('business')}
            disabled={upgrading !== null}
            style={{
              width: '100%', height: '2.5rem',
              background: '#fff', color: 'var(--accent)',
              border: 'none', borderRadius: 'var(--radius-button)',
              fontSize: '0.9375rem', fontWeight: 700,
              cursor: upgrading ? 'default' : 'pointer',
              opacity: upgrading && upgrading !== 'business' ? 0.6 : 1,
              transition: 'opacity var(--duration-fast) var(--ease-standard)',
            }}
          >
            {upgrading === 'business' ? 'Redirecting...' : 'Upgrade to Business'}
          </button>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', width: '55%' }}>Feature</th>
              <th style={{ padding: '0.875rem 1.25rem', textAlign: 'center', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>Starter</th>
              <th style={{ padding: '0.875rem 1.25rem', textAlign: 'center', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--accent)' }}>Business</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row, i) => (
              <tr key={row.label} style={{ borderBottom: i < compareRows.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: i % 2 === 0 ? '#fff' : 'var(--surface-page)' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{row.label}</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                  {typeof row.starter === 'boolean' ? <CheckCell on={row.starter} /> : row.starter}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                  {typeof row.business === 'boolean' ? <CheckCell on={row.business} /> : row.business}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
        Need more than 50 users? <a href="mailto:sales@structa.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Contact us</a> for Enterprise pricing.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current plan card (shown when on a paid plan)
// ---------------------------------------------------------------------------

interface PlanCardProps {
  status: BillingStatus;
  onManage: () => void;
  managing: boolean;
}

function PlanCard({ status, onManage, managing }: PlanCardProps) {
  const periodEnd = formatDate(status.billing_period_end);

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '1.75rem', boxShadow: 'var(--shadow-sm)', maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.25rem', margin: 0 }}>
          <PlanLabel plan={status.plan} /> plan
        </h3>
        <StatusBadge status={status.billing_status} />
      </div>

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Seats</span>
          <span style={{ fontWeight: 600 }}>{status.seats}</span>
        </div>
        {periodEnd && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Next renewal</span>
            <span style={{ fontWeight: 600 }}>{periodEnd}</span>
          </div>
        )}
      </div>

      {status.billing_status === 'past_due' && (
        <div style={{ background: 'var(--status-warning-subtle)', border: '1px solid var(--status-warning)', borderRadius: 'var(--radius-badge)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--status-warning)' }}>
          Your last payment failed. Update your payment method to avoid service interruption.
        </div>
      )}

      {status.billing_status === 'cancelled' && (
        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-badge)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Your subscription has been cancelled. You can resubscribe at any time.
        </div>
      )}

      <button
        onClick={onManage}
        disabled={managing}
        style={{
          height: '2.5rem', padding: '0 1.5rem',
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-button)',
          fontSize: '0.9rem', fontWeight: 700,
          cursor: managing ? 'default' : 'pointer',
          opacity: managing ? 0.7 : 1,
          transition: 'opacity var(--duration-fast) var(--ease-standard)',
        }}
      >
        {managing ? 'Opening portal...' : 'Manage billing'}
      </button>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Update payment method, download invoices, or cancel your subscription.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Billing page
// ---------------------------------------------------------------------------

export default function Billing() {
  useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const checkoutParam = searchParams.get('checkout');

  const load = useCallback(async () => {
    try {
      const s = await getBillingStatus();
      setStatus(s);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load billing status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (plan: 'starter' | 'business', seats?: number) => {
    setUpgrading(plan);
    try {
      const { checkoutUrl } = await createCheckoutSession(plan, seats);
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start checkout');
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    setManaging(true);
    try {
      const { portalUrl } = await getBillingPortalUrl();
      if (portalUrl) window.location.href = portalUrl;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to open billing portal');
      setManaging(false);
    }
  };

  const showPricing = !status || status.plan === 'trial' || status.billing_status === 'cancelled';

  return (
    <div style={{ maxWidth: '56rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.875rem', letterSpacing: '-0.02em', margin: '0 0 0.375rem' }}>
          Billing
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Checkout result banner */}
      {checkoutParam === 'success' && (
        <div style={{ background: 'var(--status-success-subtle)', border: '1px solid var(--status-success)', borderRadius: 'var(--radius-card)', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--status-success)', fontWeight: 600 }}>
          Payment successful! Your subscription is now active.
        </div>
      )}
      {checkoutParam === 'cancelled' && (
        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-card)', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Checkout cancelled. Your plan has not changed.
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'var(--status-warning-subtle)', border: '1px solid var(--status-warning)', borderRadius: 'var(--radius-card)', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--status-warning)' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)', flexShrink: 0 }} />
          Loading billing status...
        </div>
      )}

      {/* Current plan (paid users) */}
      {!loading && status && !showPricing && (
        <PlanCard status={status} onManage={handleManage} managing={managing} />
      )}

      {/* Pricing table (trial / cancelled) */}
      {!loading && showPricing && (
        <PricingTable onUpgrade={handleUpgrade} upgrading={upgrading} />
      )}
    </div>
  );
}
