import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* The organizer's mark and the password gate, shared by the conference
   partner page (SponsorOnePager) and the sponsor deck (SponsorDeck), which
   unlock with the same sponsor_pages password. */

/** The organizer beside the Shortcut logo: their logo when there is one,
 *  otherwise their name. On the navy hero the logo sits on a white chip so
 *  a dark logo still reads. */
export function PartnerMark({ mark, logoUrl, size, onDark = false }: {
  mark: string; logoUrl?: string; size: 'nav' | 'hero' | 'gate'; onDark?: boolean;
}) {
  if (logoUrl) {
    const h = size === 'hero' ? 'h-8 md:h-10 max-w-[200px]' : size === 'gate' ? 'h-8 max-w-[180px]' : 'h-7 max-w-[150px]';
    const img = <img src={logoUrl} alt={mark} className={`${h} w-auto object-contain`} />;
    return onDark ? <span className="inline-flex items-center rounded-xl bg-white px-3 py-2">{img}</span> : img;
  }
  const text = size === 'hero' ? 'text-[22px] md:text-[28px]' : size === 'gate' ? 'text-[22px]' : 'text-[16px]';
  return <div className={`${text} font-extrabold tracking-tight ${onDark ? 'text-white' : 'text-shortcut-blue'}`}>{mark}</div>;
}

export function Gate({ mark, logoUrl, label = 'Sponsorship partner', onSubmit }: {
  mark: string; logoUrl?: string; label?: string; onSubmit: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    const ok = await onSubmit(password);
    setChecking(false);
    if (!ok) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <PartnerMark mark={mark} logoUrl={logoUrl} size="gate" />
            <div className="h-6 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-5 w-auto" />
          </div>
          <div className="text-[12px] text-shortcut-blue/50 font-medium">{label}</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Enter password"
              autoFocus
              className={`w-full px-4 py-3 pr-11 rounded-xl border ${error ? 'border-shortcut-coral bg-red-50/30' : 'border-shortcut-blue/[.12]'} text-[15px] text-shortcut-blue font-medium placeholder:text-shortcut-blue/30 focus:outline-none focus:border-shortcut-blue/30 focus:ring-2 focus:ring-shortcut-teal/40 transition-colors`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-shortcut-blue/40 hover:text-shortcut-blue/70 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-[13px] text-shortcut-coral font-medium">Incorrect password.</p>}
          <button type="submit" disabled={checking} className="w-full py-3 rounded-full bg-shortcut-blue text-white text-[15px] font-bold hover:bg-shortcut-blue/90 transition-colors disabled:opacity-60">
            {checking ? 'Checking…' : 'View'}
          </button>
        </form>
      </div>
    </div>
  );
}
