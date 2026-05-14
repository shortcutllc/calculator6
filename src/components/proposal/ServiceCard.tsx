import React, { useState } from 'react';
import {
  Eyebrow,
  CardHeading,
  ServiceImage,
  ServiceTypeChip,
  ToggleSwitch,
  FrequencyPicker,
  ParamCell,
  Editable,
  T,
} from './shared/primitives';
import PricingOptionsSelector, { PricingOptionVariant } from './PricingOptionsSelector';
import { SERVICE_DISPLAY, SERVICE_DESC, formatCurrency } from './data';

// ============================================================================
// ServiceCard — the single most-used unit in the redesigned proposal viewer.
//
// Replaces the old space-between param rows (which caused the "Appointments"
// label to collide with the value at narrow widths) with a stacked 4-col
// param grid built from ParamCell.
//
// Supports:
//   - include/exclude toggle (dims to 55% + strikes through title when off)
//   - per-service frequency picker (×1, ×2, ×4, ×12, custom)
//   - mindfulness flavor (uses mindfulnessServiceName, mindfulnessFormat, etc.)
//   - pricing options sub-card (Half day / Full day variants)
//   - editing mode (inline editable fields via Editable component)
// ============================================================================

export interface ServiceCardService {
  serviceType: string;
  serviceCost: number;
  totalHours?: number;
  numPros?: number;
  totalAppointments?: number | string;
  appTime?: number;
  hourlyRate?: number;
  proHourly?: number;
  earlyArrival?: number;
  retouchingCost?: number;
  massageType?: string;
  // Mindfulness-specific
  classLength?: number;
  participants?: string | number;
  fixedPrice?: number;
  mindfulnessServiceName?: string;
  mindfulnessDescription?: string;
  mindfulnessFormat?: 'in-person' | 'virtual' | 'blend';
  // Pricing options sub-card
  pricingOptions?: PricingOptionVariant[];
  selectedOption?: number;
}

interface ServiceCardProps {
  service: ServiceCardService;
  /** Inline-edit mode for staff/admin */
  editing?: boolean;
  /** Field change handler used by Editable inputs */
  onFieldChange?: (field: keyof ServiceCardService, value: any) => void;
  /** Pricing-options selection handler */
  onSelectPricingOption?: (index: number) => void;
  /** Pricing-options editing handlers (admin only, used when editing && internalView) */
  onEditPricingOption?: (index: number, field: keyof PricingOptionVariant, value: any) => void;
  onAddPricingOption?: () => void;
  onRemovePricingOption?: (index: number) => void;
  onGeneratePricingOptions?: () => void;
  /** Service image on the left side */
  showImage?: boolean;
  /** Tighter padding for nested contexts */
  compact?: boolean;
  /** Include/exclude state (client view) */
  included?: boolean;
  /** How many times per year — drives the line cost calc */
  frequency?: number;
  onToggleInclude?: (next: boolean) => void;
  onChangeFrequency?: (next: number) => void;
  /** Whether to show the toggle + frequency picker controls. Off for
   *  read-only contexts (e.g. PDF render). */
  showSelectionControls?: boolean;
  /** Internal staff/admin view shows fields the client should not see:
   *  App time, Hourly/Pro hourly rate, Early arrival, Retouching. Defaults
   *  to false (client-safe view) — only Appointments / Total hours / # of
   *  pros render in the param grid. Mindfulness cards aren't affected
   *  (their cells are already client-safe). */
  internalView?: boolean;
}

const formatLabel = (format?: string): string => {
  switch (format) {
    case 'virtual':
      return 'Virtual session';
    case 'blend':
      return 'Hybrid (in-person + virtual)';
    case 'in-person':
    default:
      return 'In-person session';
  }
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  editing = false,
  onFieldChange,
  onSelectPricingOption,
  onEditPricingOption,
  onAddPricingOption,
  onRemovePricingOption,
  onGeneratePricingOptions,
  showImage = true,
  compact = false,
  included = true,
  frequency = 1,
  onToggleInclude,
  onChangeFrequency,
  showSelectionControls = true,
  internalView = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const isMindful = service.serviceType === 'mindfulness';
  const isHeadshot = service.serviceType === 'headshot' || service.serviceType === 'headshots';

  const desc = isMindful
    ? service.mindfulnessDescription || SERVICE_DESC.mindfulness
    : SERVICE_DESC[service.serviceType] || '';
  const isShort = desc.length < 180;
  const displayDesc = isShort || expanded ? desc : `${desc.slice(0, 180)}…`;

  const lineCost = (service.serviceCost || 0) * frequency;

  const handleEdit = (field: keyof ServiceCardService) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!onFieldChange) return;
    const v = e.target.value;
    onFieldChange(field, v === '' ? '' : isNaN(Number(v)) ? v : Number(v));
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 20,
        padding: compact ? '16px 18px' : '22px 24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        opacity: included ? 1 : 0.7,
        transition: 'opacity .2s, background .2s',
        background: included ? '#fff' : '#FBF7F3',
        position: 'relative',
      }}
    >

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {showImage && (
          <ServiceImage
            serviceType={service.serviceType}
            height={compact ? 120 : 160}
            width={compact ? 180 : 220}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: title block + toggle/price */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <ServiceTypeChip serviceType={service.serviceType} />
                {service.massageType && service.massageType !== 'massage' && (
                  <Eyebrow>{service.massageType}</Eyebrow>
                )}
              </div>
              <CardHeading
                size="card"
                style={{ textDecoration: included ? 'none' : 'line-through' }}
              >
                {isMindful
                  ? service.mindfulnessServiceName ||
                    SERVICE_DISPLAY[service.serviceType] ||
                    'Mindfulness'
                  : SERVICE_DISPLAY[service.serviceType] || service.serviceType}
              </CardHeading>
              {isMindful && service.mindfulnessFormat && (
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    marginTop: 4,
                  }}
                >
                  {formatLabel(service.mindfulnessFormat)}
                </div>
              )}
            </div>

            {/* Toggle + price column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12,
                flexShrink: 0,
              }}
            >
              {showSelectionControls && (
                included ? (
                  <ToggleSwitch
                    on={true}
                    onChange={onToggleInclude}
                    label="Included"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleInclude && onToggleInclude(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: T.coral,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '.01em',
                      boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                    Add back
                  </button>
                )
              )}
              <div style={{ textAlign: 'right' }}>
                {frequency > 1 ? (
                  <>
                    <div
                      style={{
                        fontFamily: T.fontD,
                        fontWeight: 700,
                        fontSize: 28,
                        color: T.navy,
                        letterSpacing: '-0.025em',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(lineCost)}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontUi,
                        fontSize: 11,
                        color: T.fgMuted,
                        fontWeight: 700,
                        letterSpacing: '.04em',
                        marginTop: 6,
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                      }}
                    >
                      {formatCurrency(service.serviceCost)}{' '}
                      <span style={{ color: T.coral }}>· ×{frequency}/yr</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontFamily: T.fontD,
                        fontWeight: 700,
                        fontSize: 28,
                        color: T.navy,
                        letterSpacing: '-0.025em',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(service.serviceCost)}
                    </div>
                    <Eyebrow style={{ marginTop: 6 }}>
                      {isMindful ? 'per session' : 'per event day'}
                    </Eyebrow>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {desc && (
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 14,
                color: T.fgMuted,
                margin: '12px 0 14px',
                lineHeight: 1.55,
                maxWidth: 640,
              }}
            >
              {displayDesc}{' '}
              {!isShort && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    color: T.coral,
                  }}
                >
                  {expanded ? 'Show less' : 'View more'}
                </button>
              )}
            </p>
          )}

          {/* Param grid — stacked label/value cells in a 4-col grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
              gap: '16px 24px',
              maxWidth: 640,
              paddingTop: 12,
              borderTop: '1px dashed rgba(0,0,0,0.07)',
            }}
          >
            {isMindful ? (
              <>
                <ParamCell
                  label="Class length"
                  value={
                    <Editable
                      value={service.classLength}
                      editing={editing}
                      suffix=" min"
                      width={64}
                      onChange={handleEdit('classLength')}
                    />
                  }
                />
                <ParamCell
                  label="Format"
                  value={
                    (service.mindfulnessFormat || 'in-person').replace('-', ' ')
                  }
                />
                <ParamCell
                  label="Participants"
                  value={service.participants || 'unlimited'}
                />
                <ParamCell
                  label="Per session"
                  value={formatCurrency(service.serviceCost)}
                />
              </>
            ) : (
              <>
                {/* Client-safe cells (always shown) */}
                <ParamCell label="Appointments" value={service.totalAppointments ?? '—'} />
                <ParamCell
                  label="Total hours"
                  value={
                    <Editable
                      value={service.totalHours}
                      editing={editing}
                      suffix="h"
                      width={56}
                      onChange={handleEdit('totalHours')}
                    />
                  }
                />
                <ParamCell
                  label="# of pros"
                  value={
                    <Editable
                      value={service.numPros}
                      editing={editing}
                      width={48}
                      onChange={handleEdit('numPros')}
                    />
                  }
                />
                {/* Internal-only cells (staff/admin editor only) — show
                    the full pro-pay picture: app time, client hourly rate,
                    pro hourly pay, early-arrival bonus, retouching (headshot).
                    For headshot, hourlyRate is derived from photographerCost
                    so we hide that cell; for everyone else, both rates are
                    visible side-by-side so margin is legible. */}
                {internalView && (
                  <>
                    <ParamCell
                      label="App time"
                      value={
                        <Editable
                          value={service.appTime}
                          editing={editing}
                          suffix=" min"
                          width={64}
                          onChange={handleEdit('appTime')}
                        />
                      }
                    />
                    {!isHeadshot && (
                      <ParamCell
                        label="Hourly rate"
                        hint="charged to client"
                        value={
                          <Editable
                            value={service.hourlyRate}
                            editing={editing}
                            prefix="$"
                            width={64}
                            onChange={handleEdit('hourlyRate')}
                          />
                        }
                      />
                    )}
                    <ParamCell
                      label="Pro hourly"
                      hint="paid to pro"
                      value={
                        <Editable
                          value={service.proHourly}
                          editing={editing}
                          prefix="$"
                          width={64}
                          onChange={handleEdit('proHourly')}
                        />
                      }
                    />
                    <ParamCell
                      label="Early arrival"
                      hint="per pro, flat"
                      value={
                        <Editable
                          value={service.earlyArrival}
                          editing={editing}
                          prefix="$"
                          width={56}
                          onChange={handleEdit('earlyArrival')}
                        />
                      }
                    />
                    {isHeadshot && (
                      <ParamCell
                        label="Retouching"
                        hint="per appt"
                        value={
                          <Editable
                            value={service.retouchingCost}
                            editing={editing}
                            prefix="$"
                            width={48}
                            onChange={handleEdit('retouchingCost')}
                          />
                        }
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Frequency picker row */}
          {showSelectionControls && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px dashed rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <FrequencyPicker
                value={frequency}
                onChange={onChangeFrequency}
                compact={compact}
                disabled={!included}
              />
              {frequency > 1 && (
                <div style={{ fontFamily: T.fontD, fontSize: 13, color: T.fgMuted }}>
                  {frequency} events / year →{' '}
                  <span style={{ fontWeight: 700, color: T.navy }}>
                    {formatCurrency(lineCost)} total annually
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pricing options sub-card.
          In admin editing mode (`editing && internalView`) we surface
          per-option editors plus Add / Remove / Generate. */}
      {(service.pricingOptions && service.pricingOptions.length > 0) ||
      (editing && internalView) ? (
        <div style={{ marginTop: 20 }}>
          <PricingOptionsSelector
            options={service.pricingOptions || []}
            selected={service.selectedOption || 0}
            onSelect={onSelectPricingOption}
            disabled={!included}
            editing={editing && internalView}
            onEditOption={onEditPricingOption}
            onAddOption={onAddPricingOption}
            onRemoveOption={onRemovePricingOption}
            onGenerateOptions={onGeneratePricingOptions}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ServiceCard;
