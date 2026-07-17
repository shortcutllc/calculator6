import React, { useState } from 'react';
import { ChevronDown, Image as ImageIcon, RefreshCw } from 'lucide-react';
import ServiceCard, { ServiceCardProps } from './ServiceCard';
import { FrequencyPicker } from './shared/primitives';
import { isMovementServiceType } from '../../utils/movementCatalog';
import { GalleryStrip } from './ServiceGallery';
import { ServiceDayDetails } from './sections/ServiceDetailsSection';
import { SERVICE_CONTENT } from './sections/serviceContent';
import CLEOutlineSection from './sections/CLEOutlineSection';
import CLEAccreditationSection from './sections/CLEAccreditationSection';
import {
  MASSAGE_TYPE_DESC,
  NAILS_TYPE_DESC,
  STRETCH_TYPE_DESC,
  SERVICE_DESC,
  SERVICE_DISPLAY,
  SERVICE_IMAGE_PATH,
  SERVICE_GALLERY,
  formatCurrency,
} from './data';

// ServiceCardRefresh — the "Proposal V2 Refresh" service card (design handoff:
// `.pv-svc`). 210px photo rail │ body, full-bleed photo with label + count
// badge, dot + name + Included toggle, description, metrics row with inline
// per-event cost, a Repeats pill, a docked "configure" pricing band, and a
// "What a … day looks like" collapse.
//
// Standard appointment services (massage / headshot / nails / hair / facials)
// render the new design. Edit mode and mindfulness / flat-rate classes delegate
// to the proven ServiceCard so nothing regresses — the mock only specs the
// standard card. Shares ServiceCardProps; the admin viewer keeps ServiceCard.

const DOT_CLASS: Record<string, string> = {
  massage: 'is-aqua',
  headshot: 'is-aqua',
  headshots: 'is-aqua',
  facial: 'is-pink',
  facials: 'is-pink',
  nails: 'is-pink',
  hair: 'is-yellow',
};

const ServiceCardRefresh: React.FC<ServiceCardProps> = (props) => {
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
    editing,
  } = props;

  const [descExpanded, setDescExpanded] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);

  const type = service.serviceType;
  const isMindful = type === 'mindfulness' || type.startsWith('mindfulness-');
  // Flat-rate classes lead with class length + per-session price (mirrors
  // ServiceCard). Assisted Stretch and Reiki are appointment-based, so they are
  // NOT flat classes; the 2026 movement & sound group classes are.
  const isFlatClass =
    isMindful ||
    type === 'sound-bath' ||
    type === 'yoga' ||
    isMovementServiceType(type);
  const isMassage = type === 'massage';

  // Edit mode keeps the proven card (inline editable fields). Every read-only
  // service type — massage, nails, headshot, hair, AND flat-rate classes
  // (mindfulness / CLE / sound bath / yoga / stretch) — uses the new design.
  if (editing) {
    return <ServiceCard {...props} />;
  }

  const isCLE = type.startsWith('mindfulness-cle');
  const displayName = isMindful
    ? service.mindfulnessServiceName || SERVICE_DISPLAY[type] || 'Mindfulness'
    : SERVICE_DISPLAY[type] || type;

  // Description resolution mirrors ServiceCard.
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
  const isLongDesc = desc.length > 170;
  const shownDesc = !isLongDesc || descExpanded ? desc : desc.slice(0, 170).trimEnd() + '…';

  // Card rail = the MAIN service-catalog image (table massage has its own).
  // The real proposal_gallery event photos feed the "N photos" strip + the
  // top mosaic — not the card rail (per ASSETS.md).
  const imageKey = isMassage && service.massageType === 'table' ? 'table-massage' : type;
  const cover = SERVICE_IMAGE_PATH[imageKey] || SERVICE_IMAGE_PATH[type];
  const gallery =
    galleryImagesProp && galleryImagesProp.length
      ? galleryImagesProp
      : SERVICE_GALLERY[type] || [];
  const photoCount = gallery.length;

  const dotClass = type.startsWith('mindfulness') ? 'is-pink' : DOT_CLASS[type] || 'is-aqua';

  const opts = service.pricingOptions || [];
  const hasOptions = opts.length > 0;

  const dayContent = SERVICE_CONTENT[type as keyof typeof SERVICE_CONTENT];

  return (
    <div
      className="pv-svc"
      style={{
        // Excluded = soft cream tint + dimmed photo, with a smooth transition
        // (mirrors the original card's include/exclude affordance).
        background: included ? undefined : '#FBF7F3',
        boxShadow: included ? undefined : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'background .25s ease, box-shadow .25s ease',
      }}
    >
      <div className="pv-svc-grid" style={{ opacity: included ? 1 : 0.85, transition: 'opacity .25s ease' }}>
        {/* Photo rail */}
        <div className="pv-svc-photo">
          {cover && <img src={cover} alt={displayName} />}
          <span className="pv-photo-label">{displayName}</span>
          {photoCount > 0 && (
            <span
              className="pv-photo-badge"
              onClick={() => {
                setDayOpen(true);
              }}
              role="button"
            >
              <ImageIcon className="ic-line" /> {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="pv-svc-body">
          <div className="pv-svc-top">
            <span className={'pv-dot ' + dotClass} aria-hidden />
            <h4 className="pv-svc-name">{displayName}</h4>
            {showSelectionControls &&
              (included ? (
                <button
                  type="button"
                  className="pv-toggle"
                  onClick={() => onToggleInclude && onToggleInclude(false)}
                  aria-pressed={true}
                  title="Included — click to remove"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span className="lbl">Included</span>
                  <span className="pv-switch" />
                </button>
              ) : (
                <button
                  type="button"
                  className="lt-btn lt-btn-coral lt-btn-sm"
                  onClick={() => onToggleInclude && onToggleInclude(true)}
                  style={{ marginLeft: 'auto', cursor: 'pointer' }}
                >
                  + Add to proposal
                </button>
              ))}
          </div>

          {/* Format segmented (massage chair/table) */}
          {isMassage && onChangeMassageType && showSelectionControls && (
            <div className="pv-format">
              <span className="pv-format-label">Format</span>
              <div className="pv-format-seg">
                {(['chair', 'table'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={service.massageType === opt ? 'on' : ''}
                    onClick={() => onChangeMassageType(opt)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="pv-desc-label">Description</p>
          <p className="pv-svc-desc">
            {shownDesc}{' '}
            {isLongDesc && (
              <span className="pv-readmore" onClick={() => setDescExpanded((v) => !v)} role="button">
                {descExpanded ? 'Read less' : 'Read more'}
              </span>
            )}
          </p>

          {/* Metrics: appointments (left) + per-event cost (right) */}
          <div className="pv-svc-metrics">
            <div>
              <div className="pv-bignum">
                {isFlatClass
                  ? service.classLength ?? '—'
                  : service.totalAppointments ?? '—'}
                {isFlatClass && service.classLength != null && (
                  <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 3 }}>min</span>
                )}
              </div>
              <div className="pv-metric-sub">
                {isFlatClass
                  ? 'Class length'
                  : service.appTime
                  ? `Appointments · ${service.appTime} min each`
                  : 'Appointments'}
              </div>
            </div>
            <div className="pv-cost">
              {service.originalServiceCost &&
                service.originalServiceCost > service.serviceCost && (
                  <div className="orig">{formatCurrency(service.originalServiceCost)}</div>
                )}
              <div className="v">{formatCurrency(service.serviceCost)}</div>
              <div className="k">{isFlatClass ? 'Per session' : 'Per event day'}</div>
            </div>
          </div>

          {/* Repeats */}
          {showSelectionControls && onChangeFrequency && (
            <div className="pv-repeats">
              <span className="rl">
                <RefreshCw className="ic-line" /> Repeats
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
      </div>

      {/* Docked pricing-options "configure" band */}
      {hasOptions && (
        <div className="pv-pricing">
          <div className="pv-pricing-head">
            <span className="lbl">Pricing options</span>
            <span className="hint">Select one to continue</span>
          </div>
          <div className="pv-popt-grid">
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
                  className={'pv-popt' + (selected ? ' on' : '')}
                  onClick={() => onSelectPricingOption && onSelectPricingOption(i)}
                >
                  <div className="pv-popt-top">
                    <span className="pv-popt-name">{opt.name}</span>
                    <span className="pv-popt-radio">
                      {selected && (
                        <svg viewBox="0 0 24 24" className="ic-line">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </div>
                  {opt.totalAppointments != null && (
                    <div className="pv-popt-appts">
                      <span className="n">{opt.totalAppointments}</span>
                      <span className="u">appts</span>
                    </div>
                  )}
                  {(opt.appTime ?? service.appTime) != null && (
                    <div className="pv-popt-len">{opt.appTime ?? service.appTime} min each</div>
                  )}
                  <div className="pv-popt-price">
                    <span className="v">{formatCurrency(opt.serviceCost)}</span>
                    {orig && <span className="orig">{formatCurrency(orig)}</span>}
                    {off ? <span className="off">{off}% off</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* "What a … day looks like" collapse */}
      {(dayContent || photoCount > 0 || isCLE) && (
        <>
          <div className="pv-collapse" onClick={() => setDayOpen((v) => !v)} role="button">
            <ChevronDown
              className="ic-line"
              style={{
                transform: dayOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
              }}
            />
            <span>
              What a {displayName.toLowerCase()} {isFlatClass ? 'session' : 'day'} looks like
            </span>
          </div>
          {dayOpen && (
            <div style={{ padding: '0 24px 22px' }}>
              {gallery.length > 0 && <GalleryStrip images={gallery} />}
              {isCLE ? (
                <div style={{ marginTop: gallery.length > 0 ? 20 : 0 }}>
                  <CLEOutlineSection />
                  <CLEAccreditationSection />
                </div>
              ) : dayContent ? (
                <div style={{ marginTop: gallery.length > 0 ? 20 : 0 }}>
                  <ServiceDayDetails content={dayContent} />
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ServiceCardRefresh;
