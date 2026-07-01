import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import {
  listOrgMembers,
  updateOrgMember,
  removeOrgMember,
  listDepartments,
  createDepartment,
  deleteDepartment,
  addDeptMember,
  removeDeptMember,
  listGuestInvites,
  createGuestInvite,
  listOrgStyles,
  extractOrgStyle,
  saveOrgStyle,
  updateOrgStyle,
  setDefaultOrgStyle,
  deleteOrgStyle,
} from '../lib/api';
import { OrgMember, Department, GuestInvite, UserRole, OrgStyle, BrandStyle, ExtractedStyleDraft } from '../types';

type Tab = 'members' | 'departments' | 'guests' | 'branding';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-6 mb-4"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members Tab
// ---------------------------------------------------------------------------
function MembersTab() {
  const { me } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    listOrgMembers()
      .then(setMembers)
      .catch((err) => setError(err.message ?? 'Failed to load members'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: UserRole) {
    setUpdating(userId);
    try {
      const updated = await updateOrgMember(userId, { role });
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: updated.role } : m)));
    } catch (err: any) {
      setError(err.message ?? 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the organisation?')) return;
    setUpdating(userId);
    try {
      await removeOrgMember(userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err: any) {
      setError(err.message ?? 'Failed to remove member');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <Section title="Organisation members">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <th className="pb-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Name / Email</th>
              <th className="pb-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <td className="py-2.5 pr-4">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {m.name ?? '—'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{m.email}</div>
                </td>
                <td className="py-2.5 pr-4">
                  {m.id === me?.user?.id ? (
                    <span
                      className="capitalize rounded px-2 py-0.5 text-xs font-medium"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                      {m.role} (you)
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      disabled={updating === m.id}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                      className="st-input"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {m.id !== me?.user?.id && (
                    <button
                      disabled={updating === m.id}
                      onClick={() => handleRemove(m.id)}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Departments Tab
// ---------------------------------------------------------------------------
function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [membersByDept, setMembersByDept] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([listDepartments(), listOrgMembers()])
      .then(([depts, mems]) => {
        setDepartments(depts);
        setMembers(mems);
        const map: Record<string, string[]> = {};
        for (const m of mems) {
          for (const dId of m.departments) {
            if (!map[dId]) map[dId] = [];
            map[dId].push(m.id);
          }
        }
        setMembersByDept(map);
      })
      .catch((err) => setError(err.message ?? 'Failed to load departments'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const dept = await createDepartment(newName.trim());
      setDepartments((prev) => [...prev, dept]);
      setNewName('');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create department');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this department? Members will lose department-based access.')) return;
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete department');
    }
  }

  async function handleToggleMember(deptId: string, userId: string) {
    const inDept = (membersByDept[deptId] ?? []).includes(userId);
    try {
      if (inDept) {
        await removeDeptMember(deptId, userId);
        setMembersByDept((prev) => ({ ...prev, [deptId]: (prev[deptId] ?? []).filter((id) => id !== userId) }));
      } else {
        await addDeptMember(deptId, userId);
        setMembersByDept((prev) => ({ ...prev, [deptId]: [...(prev[deptId] ?? []), userId] }));
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to update membership');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <Section title="Departments">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Create form */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New department name…"
          className="st-input flex-1"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="btn-primary"
          style={{ padding: '0 1rem' }}
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </div>

      {departments.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No departments yet.</p>
      )}

      <div className="space-y-2">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="rounded-lg border"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === dept.id ? null : dept.id)}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {dept.name}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {dept.memberCount} {dept.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(dept.id); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
                <span style={{ color: 'var(--text-muted)' }}>{expandedId === dept.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedId === dept.id && (
              <div
                className="border-t px-4 py-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Members</p>
                <div className="space-y-1">
                  {members.filter((m) => m.role !== 'guest').map((m) => {
                    const inDept = (membersByDept[dept.id] ?? []).includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inDept}
                          onChange={() => handleToggleMember(dept.id, m.id)}
                          className="rounded"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {m.name ?? m.email}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Guests Tab
// ---------------------------------------------------------------------------
function GuestsTab() {
  const [invites, setInvites] = useState<GuestInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  useEffect(() => {
    listGuestInvites()
      .then(setInvites)
      .catch((err) => setError(err.message ?? 'Failed to load invites'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!email.trim() || !expiresAt) return;
    setCreating(true);
    setCreatedLink(null);
    try {
      const { link } = await createGuestInvite(email.trim(), expiresAt);
      setCreatedLink(window.location.origin + link);
      setInvites((prev) => [...prev]);
      setEmail('');
      // Reload invite list
      listGuestInvites().then(setInvites).catch(() => {});
    } catch (err: any) {
      setError(err.message ?? 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <Section title="Guest invites">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Create invite form */}
      <div className="mb-5 rounded-lg border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-page)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Invite a guest (read-only, time-limited access)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@example.com"
            className="st-input flex-1"
          />
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="st-input"
            style={{ maxWidth: '12rem' }}
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !email.trim() || !expiresAt}
            className="btn-primary"
            style={{ padding: '0 1rem' }}
          >
            {creating ? 'Creating…' : 'Create invite'}
          </button>
        </div>

        {createdLink && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdLink}
              className="st-input flex-1 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(createdLink)}
              className="btn-primary text-xs"
              style={{ padding: '0.4rem 0.75rem', flexShrink: 0 }}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Invite list */}
      {invites.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No invites created yet.</p>
      )}
      <div className="space-y-2">
        {invites.map((inv) => {
          const expired = new Date(inv.expiresAt) < new Date();
          const accepted = !!inv.acceptedAt;
          return (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {inv.email}
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Expires {new Date(inv.expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      background: accepted ? 'var(--accent-subtle)' : expired ? '#fef2f2' : '#f0fdf4',
                      color: accepted ? 'var(--accent)' : expired ? '#dc2626' : '#16a34a',
                    }}
                  >
                    {accepted ? 'Accepted' : expired ? 'Expired' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Branding Tab
// ---------------------------------------------------------------------------

const COLOUR_FIELDS: { key: keyof BrandStyle['colors']; label: string }[] = [
  { key: 'primary', label: 'Primary (headings)' },
  { key: 'text', label: 'Body text' },
  { key: 'accent', label: 'Accent' },
  { key: 'secondary', label: 'Secondary' },
];

/** Editable form for a BrandStyle — reused for a new draft and for editing a saved style. */
function StyleFields({ value, onChange }: { value: BrandStyle; onChange: (s: BrandStyle) => void }) {
  const set = (patch: Partial<BrandStyle>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Colours</div>
        <div className="grid gap-2">
          {COLOUR_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="color"
                value={value.colors[key]}
                onChange={(e) => set({ colors: { ...value.colors, [key]: e.target.value.toUpperCase() } })}
                style={{ width: 34, height: 26, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <span style={{ width: 74, fontFamily: 'monospace' }}>{value.colors[key]}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Fonts &amp; structure</div>
        <div className="grid gap-2">
          <label className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Heading font
            <input
              className="w-full mt-1 rounded border px-2 py-1 text-sm"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              value={value.fonts.heading}
              onChange={(e) => set({ fonts: { ...value.fonts, heading: e.target.value } })}
            />
          </label>
          <label className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Body font
            <input
              className="w-full mt-1 rounded border px-2 py-1 text-sm"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              value={value.fonts.body}
              onChange={(e) => set({ fonts: { ...value.fonts, body: e.target.value } })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={value.structure.numberedSections}
              onChange={(e) => set({ structure: { ...value.structure, numberedSections: e.target.checked } })}
            />
            Number the sections
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={value.structure.headingRule}
              onChange={(e) => set({ structure: { ...value.structure, headingRule: e.target.checked } })}
            />
            Rule under headings
          </label>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {value.logo ? '✓ Logo captured from the document' : 'No logo captured'}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small row of colour swatches for the saved-styles list. */
function Swatches({ style }: { style: BrandStyle }) {
  return (
    <div className="flex gap-1">
      {(['primary', 'text', 'accent', 'secondary'] as const).map((k) => (
        <span key={k} title={`${k}: ${style.colors[k]}`}
          style={{ width: 16, height: 16, borderRadius: 3, background: style.colors[k], border: '1px solid var(--border-default)' }} />
      ))}
    </div>
  );
}

function BrandingTab() {
  const [styles, setStyles] = useState<OrgStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Draft (new style being extracted / edited before save)
  const [draft, setDraft] = useState<ExtractedStyleDraft | null>(null);
  const [draftName, setDraftName] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);

  // Inline editing of a saved style
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStyle, setEditStyle] = useState<BrandStyle | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    listOrgStyles()
      .then(setStyles)
      .catch((err) => setError(err.message ?? 'Failed to load styles'))
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const d = await extractOrgStyle(file);
      setDraft(d);
      setDraftName(d.name);
      setMakeDefault(styles.length === 0 ? true : true);
    } catch (err: any) {
      setError(err.message ?? 'Could not read a style from that document');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await saveOrgStyle({
        name: draftName.trim() || draft.name,
        style: draft.style,
        sourceFilePath: draft.sourceFilePath,
        sourceFilename: draft.sourceFilename,
        makeDefault,
      });
      const fresh = await listOrgStyles();
      setStyles(fresh);
      setDraft(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save style');
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault(id: string) {
    setBusy(true);
    try {
      await setDefaultOrgStyle(id);
      setStyles((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    } catch (err: any) {
      setError(err.message ?? 'Failed to set default');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this style?')) return;
    setBusy(true);
    try {
      await deleteOrgStyle(id);
      setStyles((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editStyle) return;
    setBusy(true);
    try {
      const updated = await updateOrgStyle(editingId, { name: editName.trim() || undefined, style: editStyle });
      setStyles((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      setEditingId(null);
      setEditStyle(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to update style');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Section title="Company document style">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Upload an existing company document (Word works best) and we&apos;ll capture its colours,
          fonts, logo and structure. Save it as your organisation&apos;s default and every new document
          you export will match that look.
        </p>

        <label
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Reading…' : 'Upload a document'}
          <input
            type="file"
            accept=".docx,.pdf,.txt"
            hidden
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-xs ml-3" style={{ color: 'var(--text-secondary)' }}>.docx, .pdf or .txt · max 15 MB</span>

        {error && <div className="text-sm mt-3" style={{ color: '#DC2626' }}>{error}</div>}

        {draft && (
          <div className="rounded-xl border p-4 mt-4" style={{ borderColor: 'var(--border-default)' }}>
            {draft.notes.map((n, i) => (
              <div key={i} className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>• {n}</div>
            ))}
            <label className="block text-sm mt-2 mb-3" style={{ color: 'var(--text-primary)' }}>
              Style name
              <input
                className="w-full mt-1 rounded border px-2 py-1 text-sm"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </label>
            <StyleFields value={draft.style} onChange={(s) => setDraft({ ...draft, style: s })} />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSaveDraft}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Save style
              </button>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
                Make default
              </label>
              <button onClick={() => setDraft(null)} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Saved styles">
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
        ) : styles.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No styles yet. Upload a document above to create your first one.
          </div>
        ) : (
          <div className="grid gap-2">
            {styles.map((s) => (
              <div key={s.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-3">
                  <Swatches style={s.style} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  {s.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                      Default
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    {!s.isDefault && (
                      <button onClick={() => handleSetDefault(s.id)} disabled={busy} className="text-sm" style={{ color: 'var(--accent)' }}>
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingId(editingId === s.id ? null : s.id);
                        setEditStyle(s.style);
                        setEditName(s.name);
                      }}
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {editingId === s.id ? 'Close' : 'Edit'}
                    </button>
                    <button onClick={() => handleDelete(s.id)} disabled={busy} className="text-sm" style={{ color: '#DC2626' }}>
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === s.id && editStyle && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <label className="block text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                      Name
                      <input
                        className="w-full mt-1 rounded border px-2 py-1 text-sm"
                        style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </label>
                    <StyleFields value={editStyle} onChange={setEditStyle} />
                    <button
                      onClick={handleSaveEdit}
                      disabled={busy}
                      className="rounded-lg px-4 py-2 text-sm mt-3"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default function OrgSettings() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('members');

  // Redirect non-admins
  if (me && me.user?.role !== 'admin') {
    navigate('/library', { replace: true });
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'departments', label: 'Departments' },
    { id: 'guests', label: 'Guests' },
    { id: 'branding', label: 'Branding' },
  ];

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
      <h1
        className="text-xl font-semibold mb-6"
        style={{ color: 'var(--text-primary)', fontFamily: '"Raleway", sans-serif' }}
      >
        Organisation Settings
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && <MembersTab />}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'guests' && <GuestsTab />}
      {activeTab === 'branding' && <BrandingTab />}
    </div>
  );
}
