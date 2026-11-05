import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Search, Archive, X } from 'lucide-react';
import { ops, OpsGroup, OpsPro, PRO_TYPES } from '../../services/opsService';
import { initials, shortDate } from './opsFormat';
import { ProBadges } from './ProBadges';

// Pedro's lists of Pros per city and service, each Pro in a tier (Tier 1 = first
// call). Stored on the Shortcut backend next to the Pros (ProGroup), so the admin
// site can use the same tiers later. Styled by ops-dashboard.css inside .pv-root.
//
// Make a group (city + service), then add Pros with one click per tier: from the Pros
// near the group's city, or anyone by name. Members move between tiers in place.

const TIERS = [1, 2, 3, 4, 5];
const ADD_TIERS = [1, 2, 3];
const PAGE = 20;

function proMeta(p: OpsPro): string {
  return [
    p.lastEventDate ? `Last worked ${shortDate(p.lastEventDate)}` : 'No events this year',
    p.eventsLast90 ? `${p.eventsLast90} in 90 days` : '',
    p.distanceMiles !== null && p.distanceMiles !== undefined ? `${p.distanceMiles} mi` : '',
    p.pinLocation || '',
    p.phone || '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export const ProGroups: React.FC = () => {
  const [groups, setGroups] = useState<OpsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openID, setOpenID] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGroups((await ops.groups()).groups);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="ops-sec">
        <p className="ops-sec-note">Your go-to Pros per city and service. Tier 1 is who you text first.</p>
        <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={() => setCreating((c) => !c)}>
          <Plus size={16} /> New group
        </button>
      </div>
      {error && <div className="ops-error">{error}</div>}
      {creating && (
        <NewGroup
          onCancel={() => setCreating(false)}
          onSaved={(g) => {
            setCreating(false);
            setOpenID(g.id);
            load();
          }}
          onError={setError}
        />
      )}
      {loading && !groups.length && <p className="ops-muted">Loading groups...</p>}
      {!loading && !groups.length && !creating && (
        <div className="lt-card">
          <p className="lt-body">No groups yet. Make one per city and service, like NYC Massage, then add your go-to Pros to it by tier.</p>
        </div>
      )}
      {groups.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          open={openID === g.id}
          onToggle={() => setOpenID(openID === g.id ? '' : g.id)}
          onChanged={load}
          onError={setError}
        />
      ))}
    </div>
  );
};

const NewGroup: React.FC<{ onSaved: (g: OpsGroup) => void; onCancel: () => void; onError: (m: string) => void }> = ({
  onSaved,
  onCancel,
  onError,
}) => {
  const [city, setCity] = useState('');
  const [proType, setProType] = useState('Massage');
  const [radius, setRadius] = useState(30);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!city.trim()) return;
    setSaving(true);
    try {
      const res = await ops.saveGroup({
        name: `${city.trim()} ${proType}`,
        city: city.trim(),
        proType,
        addressString: city.trim(),
        radiusMiles: radius,
      });
      onSaved(res.group);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="lt-card ops-new ops-stack">
      <div className="ops-flag-head">
        <span className="ops-flag-title">New group</span>
        <button className="ops-icon-btn" onClick={onCancel} aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="ops-row">
        <label className="ops-field flex-1">
          <span className="ops-label">City</span>
          <input
            className="ops-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="New York, NY"
            autoFocus
          />
        </label>
        <label className="ops-field">
          <span className="ops-label">Service</span>
          <select className="ops-select" value={proType} onChange={(e) => setProType(e.target.value)}>
            {PRO_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="ops-field">
          <span className="ops-label">Pros within</span>
          <select className="ops-select" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {[10, 20, 30, 50, 75, 100].map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </label>
        <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={save} disabled={saving || !city.trim()}>
          {saving ? 'Making it...' : `Make ${city.trim() ? `${city.trim()} ${proType}` : 'group'}`}
        </button>
      </div>
      <p className="ops-meta">Next you'll see the Pros near that city, and add the ones you want with one click per tier.</p>
    </div>
  );
};

const GroupCard: React.FC<{
  group: OpsGroup;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onError: (m: string) => void;
}> = ({ group, open, onToggle, onChanged, onError }) => {
  const members = group.members || [];
  const counts = TIERS.map((t) => members.filter((m) => m.tier === t).length);
  const [busy, setBusy] = useState('');

  const setTier = async (barberID: string, tier: number | null) => {
    setBusy(barberID);
    try {
      await ops.setGroupMembers(group.id, [{ barberID, tier }]);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="lt-card ops-group">
      <button className="ops-group-head" onClick={onToggle} aria-expanded={open}>
        <div>
          <p className="lt-eyebrow">{[group.city, group.proType, group.radiusMiles ? `within ${group.radiusMiles} miles` : ''].filter(Boolean).join(' · ')}</p>
          <h3 className="lt-h3">{group.name}</h3>
        </div>
        <div className="ops-tiers">
          {counts.map((n, i) =>
            n ? (
              <span key={i} className="ops-tier">
                Tier {i + 1}: {n}
              </span>
            ) : null
          )}
          {!members.length && <span className="ops-meta">No Pros yet</span>}
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {open && (
        <div className="ops-group-body">
          <div className="ops-group-grid">
            <div>
              <p className="lt-eyebrow">In this group</p>
              {!members.length && <p className="ops-muted">Nobody yet. Add Pros from the list.</p>}
              {TIERS.map((tier) => {
                const inTier = members.filter((m) => m.tier === tier);
                if (!inTier.length) return null;
                return (
                  <div key={tier} className="ops-tier-block">
                    <p className="ops-label">Tier {tier}</p>
                    <div className="ops-list">
                      {inTier.map((m) => (
                        <div key={m.barberID} className="ops-pro">
                          <div className="ops-avatar" aria-hidden>
                            {initials(m.pro ? m.pro.fullName : '')}
                          </div>
                          <div className="ops-pro-main">
                            <div className="ops-pro-line">
                              <span className="ops-name">{m.pro ? m.pro.fullName : m.barberID}</span>
                              {m.missing && <span className="ops-flagtext">No longer a Pro</span>}
                              {m.pro?.optedOut && <span className="ops-flagtext">Opted out of texts</span>}
                            </div>
                            {m.pro && <div className="ops-meta">{proMeta(m.pro)}</div>}
                            {m.pro && <ProBadges agreements={m.pro.agreements} orientation={m.pro.orientation} />}
                            <div className="ops-tier-pick" role="group" aria-label="Tier">
                              {TIERS.map((t) => (
                                <button
                                  key={t}
                                  className={m.tier === t ? 'on' : ''}
                                  disabled={busy === m.barberID}
                                  onClick={() => m.tier !== t && setTier(m.barberID, t)}
                                  aria-pressed={m.tier === t}
                                >
                                  T{t}
                                </button>
                              ))}
                              <button className="is-remove" disabled={busy === m.barberID} onClick={() => setTier(m.barberID, null)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <AddPros group={group} onAdded={onChanged} onError={onError} />
          </div>

          <div className="ops-chips mt-5">
            <button
              className="lt-btn lt-btn-ghost lt-btn-sm"
              onClick={async () => {
                try {
                  await ops.saveGroup({ groupID: group.id, archived: true });
                  onChanged();
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              <Archive size={16} /> Archive this group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AddPros: React.FC<{ group: OpsGroup; onAdded: () => void; onError: (m: string) => void }> = ({ group, onAdded, onError }) => {
  const [nearby, setNearby] = useState<OpsPro[]>([]);
  const [results, setResults] = useState<OpsPro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [busy, setBusy] = useState('');
  const tierOf = new Map((group.members || []).map((m) => [m.barberID, m.tier]));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ops.roster({
          coordinates: group.center || undefined,
          addressString: group.center ? undefined : group.city,
          proTypes: group.proType ? [group.proType] : [],
          radiusMiles: group.radiusMiles || 30,
        });
        setNearby(res.pros);
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [group.center, group.city, group.proType, group.radiusMiles, onError]);

  // Two or more letters: anyone by name, anywhere (same service). Falls back to the
  // nearby list if the backend can't search by name yet.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await ops.roster({ q: term, proTypes: group.proType ? [group.proType] : [] });
        setResults(res.pros);
      } catch {
        setResults(nearby.filter((p) => p.fullName.toLowerCase().includes(term.toLowerCase())));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, group.proType, nearby]);

  const add = async (p: OpsPro, tier: number) => {
    setBusy(p.id);
    try {
      await ops.setGroupMembers(group.id, [{ barberID: p.id, tier }]);
      onAdded();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const list = results ?? nearby;
  const page = list.slice(0, visible);
  const left = list.length - page.length;

  return (
    <div>
      <p className="lt-eyebrow">Add Pros</p>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-shortcut-blue" />
        <input
          className="ops-input w-full pl-11"
          placeholder={`Search ${group.proType ? group.proType.toLowerCase() + ' ' : ''}Pros by name`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisible(PAGE);
          }}
        />
      </div>
      <p className="ops-meta mt-2">
        {results
          ? `${results.length} match${results.length === 1 ? '' : 'es'} for "${q.trim()}", anywhere.`
          : loading
            ? 'Finding Pros...'
            : `${nearby.length} ${group.proType ? group.proType.toLowerCase() + ' ' : ''}Pros within ${group.radiusMiles || 30} miles of ${group.city || 'the group'}, most recently worked first.`}
      </p>
      <div className="ops-list mt-3">
        {!loading && !list.length && (
          <div className="ops-list-row">
            <p className="ops-muted">{results ? 'Nobody by that name.' : 'No Pros found near this city. Try a wider radius on a new group, or search by name.'}</p>
          </div>
        )}
        {page.map((p) => {
          const tier = tierOf.get(p.id);
          return (
            <div key={p.id} className="ops-pro">
              <div className="ops-avatar" aria-hidden>
                {initials(p.fullName)}
              </div>
              <div className="ops-pro-main">
                <div className="ops-pro-line">
                  <span className="ops-name">{p.fullName}</span>
                  {p.optedOut && <span className="ops-flagtext">Opted out of texts</span>}
                </div>
                <div className="ops-meta">{proMeta(p)}</div>
                <ProBadges agreements={p.agreements} orientation={p.orientation} />
                <div className="ops-tier-pick" role="group" aria-label={`Add ${p.fullName}`}>
                  {tier ? (
                    <span className="ops-oktext">In Tier {tier}</span>
                  ) : (
                    ADD_TIERS.map((t) => (
                      <button key={t} disabled={busy === p.id} onClick={() => add(p, t)}>
                        + Tier {t}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {left > 0 && (
        <button className="lt-btn lt-btn-ghost lt-btn-sm mt-3" onClick={() => setVisible((v) => v + PAGE)}>
          Show {Math.min(PAGE, left)} more ({left} left)
        </button>
      )}
    </div>
  );
};

export default ProGroups;
