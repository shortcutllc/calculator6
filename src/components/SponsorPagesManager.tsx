import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Lock, Pencil, Trash2, X, Check, ImagePlus } from 'lucide-react';
import { Button } from './Button';
import {
  listSponsorPages, createSponsorPage, updateSponsorPage, deleteSponsorPage,
  linkFor, uploadSponsorLogo, SponsorPageError,
} from '../services/sponsorPageService';
import { SPONSOR_SERVICES, type SponsorServiceId } from '../utils/sponsorPackages';
import type { SponsorPageInput, SponsorPageRecord } from '../types/sponsorPage';

/* ─────────────────────────────────────────────
   Staff screen for conference partner pages (/sponsor/:slug).

   Each row is one conference organizer. Saving creates the page straight
   away: no code change, no deploy. The link is made from the conference
   name when the page is created and never changes, so a sent link keeps
   working. Everything on the page except these
   fields is shared across all conferences (SponsorOnePager.tsx).
   ───────────────────────────────────────────── */

const ALL_IDS = SPONSOR_SERVICES.map((s) => s.id);

const pageUrl = (slug: string) => `${window.location.origin}/sponsor/${slug}`;

const LABEL = 'block text-sm font-bold text-shortcut-blue mb-1.5';
const HINT = 'mt-1 text-xs text-text-dark-60';
const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-[15px] text-shortcut-blue focus:outline-none focus:ring-2 focus:ring-shortcut-teal/60 focus:border-shortcut-teal';

type Draft = Omit<SponsorPageInput, 'services' | 'newPassword'> & {
  services: SponsorServiceId[];
  password: string;
  removePassword: boolean;
};

function toDraft(p?: SponsorPageRecord): Draft {
  return {
    organizerName: p?.organizerName ?? '',
    conferenceName: p?.conferenceName ?? '',
    dateLabel: p?.dateLabel ?? '',
    contactName: p?.contactName ?? 'Will Newton',
    contactEmail: p?.contactEmail ?? 'will@getshortcut.co',
    services: p?.services ?? [...ALL_IDS],
    logoUrl: p?.logoUrl ?? null,
    password: '',
    removePassword: false,
  };
}

function PageForm({ editing, onClose, onSaved }: {
  editing: SponsorPageRecord | null;
  onClose: () => void;
  onSaved: (p: SponsorPageRecord) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(editing ?? undefined));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));


  const toggleService = (id: SponsorServiceId) => {
    setD((prev) => {
      const on = prev.services.includes(id);
      const next = on ? prev.services.filter((s) => s !== id) : [...prev.services, id];
      // Keep the page's own order, whatever order they were ticked in.
      return { ...prev, services: ALL_IDS.filter((s) => next.includes(s)) };
    });
  };

  const [uploading, setUploading] = useState(false);
  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('The logo has to be an image file.');
    setError('');
    setUploading(true);
    try {
      set('logoUrl', await uploadSponsorLogo(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const required: [keyof Draft, string][] = [
      ['conferenceName', 'conference name'], ['organizerName', 'organizer name'],
      ['contactName', 'contact name'], ['contactEmail', 'contact email'],
    ];
    const missing = required.filter(([k]) => !String(d[k]).trim()).map(([, label]) => label);
    if (missing.length) return setError(`Fill in the ${missing.join(', ')}.`);
    if (!d.services.length) return setError('Pick at least one service.');

    const input: SponsorPageInput = {
      organizerName: d.organizerName,
      conferenceName: d.conferenceName,
      dateLabel: d.dateLabel,
      contactName: d.contactName,
      contactEmail: d.contactEmail,
      services: d.services.length === ALL_IDS.length ? null : d.services,
      logoUrl: d.logoUrl,
    };
    if (d.removePassword) input.newPassword = '';
    else if (d.password.trim()) input.newPassword = d.password.trim();

    setSaving(true);
    try {
      const saved = editing ? await updateSponsorPage(editing.id, input) : await createSponsorPage(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={save} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-shortcut-blue">{editing ? 'Edit sponsor page' : 'New sponsor page'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="sp-conf">Conference name</label>
            <input id="sp-conf" className={INPUT} value={d.conferenceName} onChange={(e) => set('conferenceName', e.target.value)} placeholder="The Deans Conference" />
          </div>
          <div>
            <label className={LABEL} htmlFor="sp-org">Organizer name</label>
            <input id="sp-org" className={INPUT} value={d.organizerName} onChange={(e) => set('organizerName', e.target.value)} placeholder="AACSB" />
          </div>
          <div className="sm:col-span-2">
            <span className={LABEL}>Partner logo <span className="font-medium text-text-dark-60">(optional)</span></span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-14 w-40 place-items-center rounded-lg border border-dashed border-gray-300 bg-white px-3">
                {d.logoUrl
                  ? <img src={d.logoUrl} alt="Partner logo" className="max-h-10 max-w-full object-contain" />
                  : <span className="text-xs text-text-dark-60">No logo</span>}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-shortcut-teal/20 px-3 py-2 text-sm font-bold text-shortcut-blue hover:bg-shortcut-teal/30">
                <ImagePlus size={15} /> {uploading ? 'Uploading…' : d.logoUrl ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {d.logoUrl && (
                <button type="button" onClick={() => set('logoUrl', null)} className="text-sm font-bold text-red-600 hover:underline">Remove</button>
              )}
            </div>
            <p className={HINT}>Shown in the page’s nav bar next to Shortcut. Without one, the organizer name is shown.</p>
          </div>
          <div>
            <label className={LABEL} htmlFor="sp-dates">Dates</label>
            <input id="sp-dates" className={INPUT} value={d.dateLabel} onChange={(e) => set('dateLabel', e.target.value)} placeholder="Oct 19 to 21, 2026" />
            <p className={HINT}>Shown on the booking card.</p>
          </div>
          <div>
            <label className={LABEL} htmlFor="sp-cname">Contact name</label>
            <input id="sp-cname" className={INPUT} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor="sp-cemail">Contact email</label>
            <input id="sp-cemail" type="email" className={INPUT} value={d.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
            <p className={HINT}>Where the “Set up a call” button emails.</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-shortcut-teal/10 px-3 py-2.5 text-sm text-shortcut-blue">
          <span className="font-bold">Link: </span>
          {window.location.host}/sponsor/{editing ? editing.slug : linkFor(d.conferenceName)}
          {!editing && <span className="text-text-dark-60"> (set from the conference name when you create the page)</span>}
        </div>

        <div className="mt-5">
          <label className={LABEL} htmlFor="sp-pw">Password</label>
          {editing?.hasPassword && (
            <label className="mb-2 flex items-center gap-2 text-sm text-shortcut-blue">
              <input type="checkbox" checked={d.removePassword} onChange={(e) => set('removePassword', e.target.checked)} />
              Remove the password and make the page open
            </label>
          )}
          <input
            id="sp-pw"
            className={INPUT}
            value={d.password}
            disabled={d.removePassword}
            onChange={(e) => set('password', e.target.value)}
            placeholder={editing?.hasPassword ? 'Leave blank to keep the current password' : 'Leave blank for an open page'}
          />
        </div>

        <div className="mt-5">
          <span className={LABEL}>Services on the page</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SPONSOR_SERVICES.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-shortcut-blue">
                <input type="checkbox" checked={d.services.includes(s.id)} onChange={() => toggleService(s.id)} />
                <span className="font-semibold">{s.name}</span>
                <span className="text-text-dark-60">{s.meta.split(' · ')[0]}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-7 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={uploading}>{editing ? 'Save changes' : 'Create page'}</Button>
        </div>
      </form>
    </div>
  );
}

export default function SponsorPagesManager() {
  const [pages, setPages] = useState<SponsorPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formFor, setFormFor] = useState<SponsorPageRecord | 'new' | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    listSponsorPages()
      .then(setPages)
      .catch((err) => setError(err instanceof SponsorPageError ? err.message : 'Could not load sponsor pages.'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [pages]);

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(pageUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(''), 1600);
    } catch { /* clipboard blocked */ }
  };

  const remove = async (p: SponsorPageRecord) => {
    if (!window.confirm(`Delete the page for ${p.conferenceName}? The link /sponsor/${p.slug} will stop working.`)) return;
    try {
      await deleteSponsorPage(p.id);
      setPages((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete.');
    }
  };

  const onSaved = (saved: SponsorPageRecord) => {
    setPages((list) => [saved, ...list.filter((x) => x.id !== saved.id)]);
    setFormFor(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1">Sponsor Pages</h1>
          <p className="mt-2 text-text-dark-60">
            One page per conference organizer, at /sponsor/&lt;link&gt;. Everything else on the page is shared.
          </p>
        </div>
        <Button onClick={() => setFormFor('new')} disabled={!!error}>New sponsor page</Button>
      </div>

      {error && (
        <div className="card-medium mb-6 border border-red-200 bg-red-50 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-text-dark-60">Loading…</p>
      ) : !error && sorted.length === 0 ? (
        <div className="card-medium text-center text-text-dark-60">No sponsor pages yet. Create the first one.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((p) => (
            <div key={p.id} className="card-medium flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-shortcut-blue">{p.conferenceName}</p>
                  {p.hasPassword && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-shortcut-blue/[.07] px-2.5 py-0.5 text-xs font-bold text-shortcut-blue">
                      <Lock size={12} /> Password
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-text-dark-60">
                  {p.organizerName}{p.dateLabel ? ` · ${p.dateLabel}` : ''} · {p.services ? `${p.services.length} services` : 'All services'}
                </p>
                <a href={`/sponsor/${p.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-shortcut-blue underline decoration-shortcut-teal decoration-2 underline-offset-2">
                  /sponsor/{p.slug}
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(p.slug)} className="inline-flex items-center gap-1.5 rounded-md bg-shortcut-teal/20 px-3 py-2 text-sm font-bold text-shortcut-blue hover:bg-shortcut-teal/30">
                  {copied === p.slug ? <Check size={15} /> : <Copy size={15} />} {copied === p.slug ? 'Copied' : 'Copy link'}
                </button>
                <a href={`/sponsor/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-shortcut-teal/20 px-3 py-2 text-sm font-bold text-shortcut-blue hover:bg-shortcut-teal/30">
                  <ExternalLink size={15} /> Open
                </a>
                <button type="button" onClick={() => setFormFor(p)} className="inline-flex items-center gap-1.5 rounded-md bg-shortcut-teal/20 px-3 py-2 text-sm font-bold text-shortcut-blue hover:bg-shortcut-teal/30">
                  <Pencil size={15} /> Edit
                </button>
                <button type="button" onClick={() => remove(p)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formFor && (
        <PageForm
          editing={formFor === 'new' ? null : formFor}
          onClose={() => setFormFor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
