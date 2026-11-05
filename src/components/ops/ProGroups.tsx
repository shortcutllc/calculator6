import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Search, Archive } from 'lucide-react';
import { ops, OpsGroup, OpsPro, PRO_TYPES } from '../../services/opsService';
import { initials, shortDate } from './opsFormat';

// Pedro's lists of Pros per city and service, each Pro in a tier (Tier 1 = first
// call). Stored on the Shortcut backend next to the Pros (ProGroup), so the admin
// site can use the same tiers later. Styled by ops-dashboard.css inside .pv-root.

const TIERS = [1, 2, 3, 4, 5];

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
        <div>
          <h2 className="lt-h3">Pro groups</h2>
          <p className="ops-sec-note">Your go-to Pros per city and service. Tier 1 is who you text first.</p>
        </div>
        <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={() => setCreating((c) => !c)}>
          <Plus size={16} /> New group
        </button>
      </div>
      {error && <div className="ops-error">{error}</div>}
      {creating && (
        <NewGroup
          onSaved={(g) => {
            setCreating(false);
            setOpenID(g.id);
            load();
          }}
          onError={setError}
        />
      )}
      {loading && <p className="ops-muted">Loading groups...</p>}
      {!loading && !groups.length && !creating && (
        <div className="lt-card">
          <p className="lt-body">No groups yet. Make one per city and service, like "NYC Massage", then add Pros to it by tier.</p>
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

const NewGroup: React.FC<{ onSaved: (g: OpsGroup) => void; onError: (m: string) => void }> = ({ onSaved, onError }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [proType, setProType] = useState('Massage');
  const [radius, setRadius] = useState(30);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const res = await ops.saveGroup({
        name: name.trim() || `${city.trim()} ${proType}`,
        city: city.trim(),
        proType,
        addressString: (address || city).trim() || undefined,
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
      <p className="lt-eyebrow">New group</p>
      <div className="ops-grid2">
        <label className="ops-field">
          <span className="ops-label">City</span>
          <input className="ops-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York, NY" />
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
          <span className="ops-label">Name (optional)</span>
          <input className="ops-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${city || 'City'} ${proType}`} />
        </label>
        <label className="ops-field">
          <span className="ops-label">Search within</span>
          <select className="ops-select" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {[10, 20, 30, 50, 75, 100].map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="ops-field">
        <span className="ops-label">Center the search on (optional)</span>
        <input className="ops-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="An address, or leave blank for the city" />
      </label>
      <div>
        <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={save} disabled={saving || !city.trim()}>
          {saving ? 'Saving...' : 'Save group'}
        </button>
      </div>
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
  const [adding, setAdding] = useState(false);

  const setTier = async (barberID: string, tier: number | null) => {
    try {
      await ops.setGroupMembers(group.id, [{ barberID, tier }]);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
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
          {TIERS.map((tier) => {
            const inTier = members.filter((m) => m.tier === tier);
            if (!inTier.length) return null;
            return (
              <div key={tier}>
                <p className="lt-eyebrow">Tier {tier}</p>
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
                        {m.pro && (
                          <div className="ops-meta">
                            {[
                              m.pro.lastEventDate ? `Last worked ${shortDate(m.pro.lastEventDate)}` : 'No events this year',
                              m.pro.eventsLast90 ? `${m.pro.eventsLast90} in 90 days` : '',
                              m.pro.phone || '',
                              m.pro.pinLocation || '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                      <select className="ops-select" value={m.tier} onChange={(e) => setTier(m.barberID, Number(e.target.value))} aria-label="Tier">
                        {TIERS.map((t) => (
                          <option key={t} value={t}>
                            Tier {t}
                          </option>
                        ))}
                      </select>
                      <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setTier(m.barberID, null)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="ops-chips mt-5">
            <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={() => setAdding((a) => !a)}>
              <Search size={16} /> Add Pros near {group.city || 'this group'}
            </button>
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
              <Archive size={16} /> Archive group
            </button>
          </div>
          {adding && <AddPros group={group} onAdded={onChanged} onError={onError} />}
        </div>
      )}
    </div>
  );
};

const AddPros: React.FC<{ group: OpsGroup; onAdded: () => void; onError: (m: string) => void }> = ({ group, onAdded, onError }) => {
  const [pros, setPros] = useState<OpsPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tier, setTier] = useState(1);
  const memberIDs = new Set((group.members || []).map((m) => m.barberID));

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
        setPros(res.pros);
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [group.center, group.city, group.proType, group.radiusMiles, onError]);

  const candidates = pros.filter((p) => !memberIDs.has(p.id));
  return (
    <div className="ops-stack mt-4">
      <div className="ops-list max-h-96 overflow-y-auto">
        {loading && (
          <div className="ops-list-row">
            <p className="ops-muted">Finding Pros...</p>
          </div>
        )}
        {!loading && !candidates.length && (
          <div className="ops-list-row">
            <p className="ops-muted">Everyone nearby is already in this group.</p>
          </div>
        )}
        {candidates.map((p) => (
          <label key={p.id} className="ops-pro cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                })
              }
            />
            <div className="ops-avatar" aria-hidden>
              {initials(p.fullName)}
            </div>
            <div className="ops-pro-main">
              <div className="ops-name">{p.fullName}</div>
              <div className="ops-meta">
                {[
                  p.lastEventDate ? `Last worked ${shortDate(p.lastEventDate)}` : 'No events this year',
                  p.eventsLast90 ? `${p.eventsLast90} in 90 days` : '',
                  p.distanceMiles !== null && p.distanceMiles !== undefined ? `${p.distanceMiles} mi` : '',
                  p.pinLocation || '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </label>
        ))}
      </div>
      {selected.size > 0 && (
        <div className="ops-row">
          <label className="ops-field">
            <span className="ops-label">Add as</span>
            <select className="ops-select" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  Tier {t}
                </option>
              ))}
            </select>
          </label>
          <button
            className="lt-btn lt-btn-navy lt-btn-sm"
            onClick={async () => {
              try {
                await ops.setGroupMembers(
                  group.id,
                  Array.from(selected).map((barberID) => ({ barberID, tier }))
                );
                setSelected(new Set());
                onAdded();
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            Add {selected.size} as Tier {tier}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProGroups;
