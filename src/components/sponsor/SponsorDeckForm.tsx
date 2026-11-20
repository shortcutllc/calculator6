import { useState } from 'react';
import { Check, Copy, ExternalLink, Eye, Link2, X } from 'lucide-react';
import { Button } from '../Button';
import { saveSponsorDeck, createDeckLink, deckUrl, cleanDeck } from '../../services/sponsorPageService';
import type { SponsorDeckDetails, SponsorPageRecord, DeckTierId } from '../../types/sponsorPage';

/* ─────────────────────────────────────────────
   Staff form for a page's SPONSOR DECK (SponsorDeck.tsx), opened from its
   row on the Sponsor Pages tab. Once an organizer has bought the lounge,
   this is where their offer goes, and where the link they send to their
   sponsors is made.

   The link is /lounge/<random token>: it never leads a sponsor back to the
   partner page, which shows the organizer's margin. The staff preview at
   /sponsor/<slug>/deck is for us only.

   Everything here is optional. The deck leaves out what isn't filled in.
   Conference facts come from the organizer's own site, with a source.
   ───────────────────────────────────────────── */

const LABEL = 'block text-sm font-bold text-shortcut-blue mb-1.5';
const HINT = 'mt-1 text-xs text-text-dark-60';
const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-[15px] text-shortcut-blue focus:outline-none focus:ring-2 focus:ring-shortcut-teal/60 focus:border-shortcut-teal';
const SECTION = 'mt-7 border-t border-gray-200 pt-6';
const H3 = 'm-0 mb-1 text-lg font-bold text-shortcut-blue';

const TIERS: { id: DeckTierId; label: string; when: string; example: string }[] = [
  { id: 'title', label: 'Title sponsor', when: 'The whole lounge in one sponsor’s name.', example: '$60,000' },
  { id: 'station', label: 'Station sponsor', when: 'One station each.', example: '$20,000' },
  { id: 'mindful', label: 'Mindful Reset sponsor', when: 'A guided session in one sponsor’s name.', example: '$10,000' },
];

interface Draft {
  venue: string;
  about: string;
  audience: string;
  stats: { fig: string; label: string }[];
  statsSource: string;
  tiers: Record<DeckTierId, { price: string; available: string }>;
  contactName: string;
  contactTeam: string;
  contactEmail: string;
}

function toDraft(deck: SponsorDeckDetails | null): Draft {
  const d = deck ?? {};
  const stats = [...(d.stats ?? [])];
  while (stats.length < 3) stats.push({ fig: '', label: '' });
  const tier = (id: DeckTierId) => ({ price: d.tiers?.[id]?.price ?? '', available: d.tiers?.[id]?.available ?? '' });
  return {
    venue: d.venue ?? '',
    about: d.about ?? '',
    audience: (d.audience ?? []).join('\n'),
    stats,
    statsSource: d.statsSource ?? '',
    tiers: { title: tier('title'), station: tier('station'), mindful: tier('mindful') },
    contactName: d.salesContact?.name ?? '',
    contactTeam: d.salesContact?.team ?? '',
    contactEmail: d.salesContact?.email ?? '',
  };
}

function toDeck(x: Draft): SponsorDeckDetails {
  return cleanDeck({
    venue: x.venue,
    about: x.about,
    audience: x.audience.split('\n'),
    stats: x.stats,
    statsSource: x.statsSource,
    tiers: x.tiers,
    salesContact: { name: x.contactName, team: x.contactTeam, email: x.contactEmail },
  });
}

export default function SponsorDeckForm({ page, onClose, onSaved }: {
  page: SponsorPageRecord;
  onClose: () => void;
  onSaved: (p: SponsorPageRecord) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(page.deck));
  const [token, setToken] = useState(page.deckToken);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const setTier = (id: DeckTierId, k: 'price' | 'available', v: string) =>
    setD((prev) => ({ ...prev, tiers: { ...prev.tiers, [id]: { ...prev.tiers[id], [k]: v } } }));
  const setStat = (i: number, k: 'fig' | 'label', v: string) =>
    setD((prev) => ({ ...prev, stats: prev.stats.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  const makeLink = async () => {
    setError('');
    setLinking(true);
    try {
      const saved = await createDeckLink(page.id);
      setToken(saved.deckToken);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the link.');
    } finally {
      setLinking(false);
    }
  };

  const copy = async () => {
    if (!token) return;
    try { await navigator.clipboard.writeText(deckUrl(token)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (d.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(d.contactEmail.trim())) return setError('The sales contact’s email doesn’t look right.');
    if (d.contactEmail.trim() && !d.contactName.trim()) return setError('Add the sales contact’s name to go with their email.');
    const halfStat = d.stats.some((s) => !!s.fig.trim() !== !!s.label.trim());
    if (halfStat) return setError('Each figure needs both the number and what it counts.');
    if (d.stats.some((s) => s.fig.trim()) && !d.statsSource.trim()) return setError('Say where the figures come from, like the organizer’s website.');
    setSaving(true);
    try {
      onSaved(await saveSponsorDeck(page.id, toDeck(d)));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={save} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-shortcut-blue">Sponsor deck</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        <p className="m-0 text-sm text-text-dark-60">
          What {page.organizerName} sends its sponsors to sell the lounge at {page.conferenceName}, as a page and a PDF.
          Everything below is optional; the deck leaves out what isn’t filled in.
        </p>

        {/* The link */}
        <div className="mt-5 rounded-lg bg-shortcut-teal/10 px-4 py-3.5 text-sm text-shortcut-blue">
          {token ? (
            <>
              <div className="font-bold">The link {page.organizerName} sends its sponsors</div>
              <div className="mt-1 break-all font-semibold">{deckUrl(token).replace(/^https?:\/\//, '')}</div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-bold text-shortcut-blue hover:bg-white/70">
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
                </button>
                <a href={deckUrl(token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-bold text-shortcut-blue hover:bg-white/70">
                  <ExternalLink size={15} /> Open
                </a>
              </div>
              <p className={HINT}>It has a Download PDF button. It never leads to the partner page.</p>
            </>
          ) : (
            <>
              <div className="font-bold">No sponsor link yet</div>
              <p className="m-0 mt-1 text-text-dark-60">Make it once {page.organizerName} has signed and you’ve filled in their offer. The link never changes after that.</p>
              <button type="button" onClick={makeLink} disabled={linking} className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-shortcut-blue px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60">
                <Link2 size={15} /> {linking ? 'Making the link…' : 'Make the sponsor link'}
              </button>
            </>
          )}
          <a href={`/sponsor/${page.slug}/deck`} target="_blank" rel="noreferrer" className="mt-3 flex w-fit items-center gap-1.5 text-sm font-bold underline decoration-shortcut-teal decoration-2 underline-offset-2">
            <Eye size={15} /> Preview the deck (staff only, saved changes)
          </a>
        </div>

        {/* The organizer's offer */}
        <div className={SECTION}>
          <h3 className={H3}>{page.organizerName}’s offer</h3>
          <p className="m-0 mb-4 text-sm text-text-dark-60">Their prices and their sales contact. Sponsors buy from {page.organizerName}, so the deck never shows ours.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className={LABEL} htmlFor="dk-cname">Sales contact</label>
              <input id="dk-cname" className={INPUT} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Jamie Russo" />
            </div>
            <div>
              <label className={LABEL} htmlFor="dk-cteam">Their team</label>
              <input id="dk-cteam" className={INPUT} value={d.contactTeam} onChange={(e) => set('contactTeam', e.target.value)} placeholder="GCUC Partnerships" />
            </div>
            <div>
              <label className={LABEL} htmlFor="dk-cmail">Their email</label>
              <input id="dk-cmail" className={INPUT} value={d.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="partners@gcuc.co" />
            </div>
          </div>
          <p className={HINT}>The deck’s Reserve button emails them. Without a contact, it says to contact the {page.organizerName} partnerships team.</p>

          <div className="mt-5 grid grid-cols-1 gap-3">
            {TIERS.map((t) => (
              <div key={t.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1.3fr_1fr_1fr]">
                <div>
                  <div className="text-sm font-bold text-shortcut-blue">{t.label}</div>
                  <div className="text-xs text-text-dark-60">{t.when}</div>
                </div>
                <div>
                  <label className={LABEL} htmlFor={`dk-${t.id}-p`}>Price</label>
                  <input id={`dk-${t.id}-p`} className={INPUT} value={d.tiers[t.id].price} onChange={(e) => setTier(t.id, 'price', e.target.value)} placeholder={t.example} />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`dk-${t.id}-a`}>Available</label>
                  <input id={`dk-${t.id}-a`} className={INPUT} value={d.tiers[t.id].available} onChange={(e) => setTier(t.id, 'available', e.target.value)} placeholder={t.id === 'station' ? 'Leave blank to show none' : '1 of 1 available'} />
                </div>
              </div>
            ))}
          </div>
          <p className={HINT}>Leave a price blank and the sponsor link says “Price set by” your organizer. The staff preview shows labeled sample prices in its place.</p>
        </div>

        {/* The conference */}
        <div className={SECTION}>
          <h3 className={H3}>About {page.conferenceName}</h3>
          <p className="m-0 mb-4 text-sm text-text-dark-60">From {page.organizerName}’s own site or materials. This fills the Who attends section; without it, the section is left out.</p>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={LABEL} htmlFor="dk-venue">Venue</label>
              <input id="dk-venue" className={INPUT} value={d.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Miami Ironside, Little River" />
              <p className={HINT}>Shown with the dates at the top.</p>
            </div>
            <div>
              <label className={LABEL} htmlFor="dk-about">About the conference</label>
              <input id="dk-about" className={INPUT} value={d.about} onChange={(e) => set('about', e.target.value)} placeholder="GCUC Miami fills two full days with strategic and tactical tracks, roundtables and an exhibitor hall." />
              <p className={HINT}>One plain sentence.</p>
            </div>
            <div>
              <label className={LABEL} htmlFor="dk-aud">Who attends</label>
              <textarea id="dk-aud" rows={5} className={INPUT} value={d.audience} onChange={(e) => set('audience', e.target.value)} placeholder={'Coworking owners and operators\nDevelopers and landlords\nHR and people leaders'} />
              <p className={HINT}>One group per line, up to nine.</p>
            </div>
            <div>
              <span className={LABEL}>Figures</span>
              <div className="grid grid-cols-1 gap-2">
                {d.stats.map((s, i) => (
                  <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
                    <input className={INPUT} value={s.fig} onChange={(e) => setStat(i, 'fig', e.target.value)} placeholder={['20,000+', '50', '$58B'][i]} aria-label={`Figure ${i + 1}`} />
                    <input className={INPUT} value={s.label} onChange={(e) => setStat(i, 'label', e.target.value)} placeholder={['people through GCUC’s doors', 'GCUC events around the world', 'projected coworking market by 2033'][i]} aria-label={`What figure ${i + 1} counts`} />
                  </div>
                ))}
              </div>
              <p className={HINT}>Up to three, only from the organizer. Never invent one.</p>
            </div>
            <div>
              <label className={LABEL} htmlFor="dk-src">Where the figures come from</label>
              <input id="dk-src" className={INPUT} value={d.statsSource} onChange={(e) => set('statsSource', e.target.value)} placeholder="gcuc.co" />
            </div>
          </div>
        </div>

        {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-7 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save the deck</Button>
        </div>
      </form>
    </div>
  );
}
