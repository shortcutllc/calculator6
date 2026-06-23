import React, { useState } from 'react';
import { Check, ChevronDown, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { ServiceCardProps } from '../ServiceCard';
import { FrequencyPicker } from '../shared/primitives';
import { SERVICE_CONTENT } from '../sections/serviceContent';
import {
  MASSAGE_TYPE_DESC,
  NAILS_TYPE_DESC,
  STRETCH_TYPE_DESC,
  SERVICE_DESC,
  SERVICE_DISPLAY,
  SERVICE_IMAGE_PATH,
  SERVICE_GALLERY,
  formatCurrency,
} from '../data';

// MobileServiceCard — the stacked (photo-on-top) mobile rendering of a service,
// per `Proposal V2 Mobile.html` (`.pvm-svc`). Mirrors ServiceCardRefresh's data
// resolution and ServiceCardProps interface so the call site is symmetric, but
// lays the card out vertically for phones and swaps the desktop "What a … day
// looks like" gallery collapse for the "How it works" feature checklist
// (`SERVICE_CONTENT[slug].features`).

const DOT: Record<string, string> = {
  massage: 'var(--sc-aqua)',
  headshot: 'var(--sc-aqua)',
  headshots: 'var(--sc-aqua)',
  facial: 'var(--sc-pink)',
  facials: 'var(--sc-pink)',
  nails: 'var(--sc-pink)',
  hair: 'var(--sc-yellow)',
};

interface MobileServiceCardProps extends ServiceCardProps {
  /** Open the shared mobile lightbox with this service's photos. */
  onOpenLightbox?: (images: string[], start?: number) => void;
}

const MobileServiceCard: React.FC<MobileServiceCardProps> = (props) => {
  const {
    service,
    included = true,
    frequency = 1,
    onToggleInclude,
    onChangeFrequency,
    onChangeMassageType,
    showSelectionControls = true,
    galleryImages: galleryImagesProp,
    autoRecurringDiscount,
    onSelectPricingOption,
    onOpenLightbox,
  } = props;

  const [descExpanded, setDescExpanded] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const type = service.serviceType;
  const isMindful = type === 'mindfulness' || type.startsWith('mindfulness-');
  const isFlatClass = isMindful || type === 'sound-bath' || type === 'yoga';
  const isMassage = type === 'massage';

  const displayName = isMindful
    ? service.mindfulnessServiceName || SERVICE_DISPLAY[type] || 'Mindfulness'
    : SERVICE_DISPLAY[type] || type;

  const variantDesc =
    isMassage && service.massageType
      ? MASSAGE_TYPE_DESC[service.massageType]
      : type === 'nails' && service.nailsType
      ? NAILS_TYPE_DESC[service.nailsType]
      : type === 'stretch' && (service as any).stretchType
      ? STRETCH_TYPE_DESC[(service as any).stretchType]
      : undefined;
  const desc = isMindful
    ? service.mindfulnessDescription || SERVICE_DESC.mindfulness || ''
    : variantDesc || SERVICE_DESC[type] || '';
  const isLongDesc = desc.length > 150;
  const shownDesc =
    !isLongDesc || descExpanded ? desc : desc.slice(0, 150).trimEnd() + '…';

  const imageKey =
    isMassage && service.massageType === 'table' ? 'table-massage' : type;
  const cover = SERVICE_IMAGE_PATH[imageKey] || SERVICE_IMAGE_PATH[type];
  const gallery =
    galleryImagesProp && galleryImagesProp.length
      ? galleryImagesProp
      : SERVICE_GALLERY[type] || [];
  const photoCount = gallery.length;

  const dot = type.startsWith('mindfulness') ? 'var(--sc-pink)' : DOT[type] || 'var(--sc-aqua)';

  const opts = service.pricingOptions || [];
  const hasOptions = opts.length > 0;

  const content = SERVICE_CONTENT[type as keyof typeof SERVICE_CONTENT];
  const features = content?.features || [];

  return (
    <div className={'pvm-svc' + (included ? '' : ' off')}>
      {/* Cover photo */}
      <div className="pvm-svc-photo">
        {cover && <img src={cover} alt={displayName} />}
        <span className="pvm-photo-label">{displayName}</span>
        {photoCount > 0 && (
          <button
            type="button"
            className="pvm-photo-count"
            onClick={() => onOpenLightbox && onOpenLightbox(gallery, 0)}
          >
            <ImageIcon /> {photoCount}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="pvm-svc-body">
        <div className="pvm-svc-top">
          <span className="pvm-dot" style={{ background: dot }} aria-hidden />
          <h4 className="pvm-svc-name">{displayName}</h4>
          {showSelectionControls &&
            (included ? (
              <button
                type="button"
                className="pvm-toggle"
                onClick={() => onToggleInclude && onToggleInclude(false)}
                aria-pressed
                title="Included — tap to remove"
              >
                <span className="lbl">Included</span>
                <span className="pvm-switch" />
              </button>
            ) : (
              <button
                type="button"
                className="pvm-add"
                onClick={() => onToggleInclude && onToggleInclude(true)}
              >
                + Add
              </button>
            ))}
        </div>

        {/* Format segmented (massage chair/table) */}
        {isMassage && onChangeMassageType && showSelectionControls && (
          <div className="pvm-format">
            <span className="pvm-format-label">Format</span>
            <div className="pvm-format-seg">
              {(['chair', 'table'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={service.massageType === opt ? 'on' : ''}
                  onClick={() => onChangeMassageType(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="pvm-svc-desc">
          {shownDesc}{' '}
          {isLongDesc && (
            <span
              className="pvm-readmore"
              role="button"
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? 'Read less' : 'Read more'}
            </span>
          )}
        </p>

        {/* Metrics */}
        <div className="pvm-svc-metrics">
          <div>
            <div className="pvm-bignum">
              {isFlatClass ? service.classLength ?? '—' : service.totalAppointments ?? '—'}
              {isFlatClass && service.classLength != null && (
                <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 3 }}>min</span>
              )}
            </div>
            <div className="pvm-metric-sub">
              {isFlatClass
                ? 'Class length'
                : service.appTime
                ? `Appts · ${service.appTime} min each`
                : 'Appointments'}
            </div>
          </div>
          <div className="pvm-cost">
            {service.originalServiceCost &&
              service.originalServiceCost > service.serviceCost && (
                <div className="orig">{formatCurrency(service.originalServiceCost)}</div>
              )}
            <div className="v">{formatCurrency(service.serviceCost)}</div>
            <div className="k">{isFlatClass ? 'Per session' : 'Per event day'}</div>
          </div>
        </div>

        {/* Repeats — recurring-frequency picker (drives the volume discount).
            Same FrequencyPicker as desktop (portaled menu, shows the discount
            per level + Custom) so mobile and desktop are fully consistent. */}
        {showSelectionControls && onChangeFrequency && (
          <div className="pvm-repeats">
            <span className="rl">
              <RefreshCw /> Repeats
            </span>
            <FrequencyPicker
              value={frequency}
              onChange={onChangeFrequency}
              compact
              hideLabel
              disabled={!included}
            />
          </div>
        )}
      </div>

      {/* How it works (feature checklist) — mock order: above pricing options */}
      {features.length > 0 && (
        <div className={'pvm-how' + (howOpen ? ' open' : '')}>
          <button type="button" className="pvm-how-head" onClick={() => setHowOpen((v) => !v)}>
            <span>How it works</span>
            <ChevronDown className="chev" />
          </button>
          <div className="pvm-how-body">
            <div className="pvm-how-inner">
              {features.map((f, i) => (
                <div className="pvm-how-item" key={i}>
                  <Check /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pricing options (stacked rows) */}
      {hasOptions && (
        <div className="pvm-pricing">
          <div className="pvm-pricing-head">
            <span className="lbl">Pricing options</span>
            <span className="hint">Select one</span>
          </div>
          {opts.map((opt, i) => {
            const selected = (service.selectedOption ?? 0) === i;
            const off = opt.discountPercent ?? autoRecurringDiscount;
            const orig =
              opt.originalPrice && opt.originalPrice > opt.serviceCost
                ? opt.originalPrice
                : undefined;
            return (
              <button
                key={i}
                type="button"
                className={'pvm-popt' + (selected ? ' on' : '')}
                onClick={() => onSelectPricingOption && onSelectPricingOption(i)}
              >
                <span className="pvm-popt-radio">{selected && <Check />}</span>
                <div className="pvm-popt-main">
                  <div className="nm">{opt.name}</div>
                  <div className="sb">
                    {opt.totalAppointments != null ? `${opt.totalAppointments} appts` : ''}
                    {(opt.appTime ?? service.appTime) != null
                      ? ` · ${opt.appTime ?? service.appTime} min each`
                      : ''}
                  </div>
                </div>
                <div className="pvm-popt-price">
                  <div className="v">{formatCurrency(opt.serviceCost)}</div>
                  {orig && <span className="orig">{formatCurrency(orig)}</span>}
                  {off ? <span className="off">{off}% off</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileServiceCard;
