import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Search, Archive } from 'lucide-react';
import { ops, OpsGroup, OpsPro, PRO_TYPES } from '../../services/opsService';
import { shortDate } from './opsFormat';

// Pedro's lists of Pros per city and service, each Pro in a tier (Tier 1 = first
// call). Stored on the Shortcut backend next to the Pros (ProGroup), so the admin
// site can use the same tiers later.

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-text-dark">
          Your go-to Pros per city and service. Tier 1 is who you text first.
        </p>
        <button
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-1 rounded-full bg-[#9EFAFF] px-5 py-2.5 text-sm font-bold text-[#09364f]"
        >
          <Plus size={15} /> New group
        </button>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
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
      {loading && <p className="text-sm text-text-dark-60">Loading groups...</p>}
      {!loading && !groups.length && !creating && (
        <div className="card-small text-text-dark">
          No groups yet. Make one per city and service, like "NYC Massage", then add Pros to it by tier.
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
    <div className="card-small space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="City">
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York, NY" />
        </Field>
        <Field label="Service">
          <select className={inputClass} value={proType} onChange={(e) => setProType(e.target.value)}>
            {PRO_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Name (optional)">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${city || 'City'} ${proType}`} />
        </Field>
        <Field label="Center the search on (optional)">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="An address, or leave blank for the city" />
        </Field>
        <Field label="Search within">
          <select className={inputClass} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {[10, 20, 30, 50, 75, 100].map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        onClick={save}
        disabled={saving || !city.trim()}
        className="rounded-full bg-[#09364f] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save group'}
      </button>
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
    <div className="card-small">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggle}>
        <div>
          <div className="text-lg font-extrabold text-shortcut-blue">{group.name}</div>
          <div className="text-sm text-text-dark">
            {[group.city, group.proType, group.radiusMiles ? `within ${group.radiusMiles} miles` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {counts.map((n, i) =>
            n ? (
              <span key={i} className="rounded-full bg-[#09364f] px-2.5 py-0.5 text-xs font-bold text-white">
                T{i + 1}: {n}
              </span>
            ) : null
          )}
          {!members.length && <span className="text-xs font-bold text-text-dark">No Pros yet</span>}
          {open ? <ChevronUp size={18} className="text-text-dark" /> : <ChevronDown size={18} className="text-text-dark" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {TIERS.map((tier) => {
            const inTier = members.filter((m) => m.tier === tier);
            if (!inTier.length) return null;
            return (
              <div key={tier}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-dark-60">Tier {tier}</div>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
                  {inTier.map((m) => (
                    <div key={m.barberID} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="font-bold text-text-dark">
                          {m.pro ? m.pro.fullName : m.barberID}
                          {m.missing && <span className="ml-2 text-xs font-bold text-red-800">No longer a Pro</span>}
                          {m.pro?.optedOut && <span className="ml-2 text-xs font-bold text-red-800">Opted out of texts</span>}
                        </div>
                        {m.pro && (
                          <div className="text-xs text-text-dark">
                            {m.pro.lastEventDate ? `Last worked ${shortDate(m.pro.lastEventDate)}` : 'No events this year'}
                            {m.pro.eventsLast90 ? ` · ${m.pro.eventsLast90} in 90 days` : ''}
                            {m.pro.phone ? ` · ${m.pro.phone}` : ''}
                            {m.pro.pinLocation ? ` · ${m.pro.pinLocation}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-xl border border-gray-300 px-2 py-1 text-xs text-text-dark"
                          value={m.tier}
                          onChange={(e) => setTier(m.barberID, Number(e.target.value))}
                          aria-label="Tier"
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>
                              Tier {t}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => setTier(m.barberID, null)} className="text-xs font-bold text-text-dark underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAdding((a) => !a)}
              className="inline-flex items-center gap-1 rounded-full border-2 border-[#9EFAFF] px-4 py-2 text-xs font-bold text-[#09364f]"
            >
              <Search size={14} /> Add Pros near {group.city || 'this group'}
            </button>
            <button
              onClick={async () => {
                try {
                  await ops.saveGroup({ groupID: group.id, archived: true });
                  onChanged();
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-text-dark"
            >
              <Archive size={14} /> Archive group
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
    <div className="rounded-2xl border border-gray-200 p-4">
      {loading && <p className="text-sm text-text-dark-60">Finding Pros...</p>}
      {!loading && !candidates.length && <p className="text-sm text-text-dark">Everyone nearby is already in this group.</p>}
      <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
        {candidates.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-start gap-3 py-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
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
            <div className="min-w-0">
              <div className="font-bold text-text-dark">{p.fullName}</div>
              <div className="text-xs text-text-dark">
                {p.lastEventDate ? `Last worked ${shortDate(p.lastEventDate)}` : 'No events this year'}
                {p.eventsLast90 ? ` · ${p.eventsLast90} in 90 days` : ''}
                {p.distanceMiles !== null && p.distanceMiles !== undefined ? ` · ${p.distanceMiles} mi` : ''}
                {p.pinLocation ? ` · ${p.pinLocation}` : ''}
              </div>
            </div>
          </label>
        ))}
      </div>
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <select className="rounded-xl border border-gray-300 px-2 py-1 text-sm text-text-dark" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                Tier {t}
              </option>
            ))}
          </select>
          <button
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
            className="rounded-full bg-[#09364f] px-4 py-2 text-xs font-bold text-white"
          >
            Add {selected.size} as Tier {tier}
          </button>
        </div>
      )}
    </div>
  );
};

const inputClass = 'mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">{label}</span>
    {children}
  </label>
);

export default ProGroups;
