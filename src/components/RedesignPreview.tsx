import React, { useState } from 'react';
import ServiceCard, { ServiceCardService } from './proposal/ServiceCard';
import {
  Eyebrow,
  CardHeading,
  StatusPill,
  MiniStat,
  SectionLabel,
  CollapseHead,
  ServiceTypeChip,
  ToggleSwitch,
  FrequencyPicker,
  ParamCell,
  T,
} from './proposal/shared/primitives';

// ============================================================================
// RedesignPreview — temporary route at /redesign-preview that renders the new
// design-system components in isolation with sample data. Lets us iterate on
// look + behavior without touching the real proposal viewers yet.
//
// REMOVE THIS COMPONENT (and its route in App.tsx) once the real viewers are
// migrated and the preview is no longer useful.
// ============================================================================

const sampleMassage: ServiceCardService = {
  serviceType: 'massage',
  massageType: 'chair',
  totalHours: 4,
  numPros: 2,
  totalAppointments: 24,
  appTime: 20,
  hourlyRate: 135,
  proHourly: 50,
  earlyArrival: 25,
  retouchingCost: 0,
  serviceCost: 1080,
};

const sampleHeadshot: ServiceCardService = {
  serviceType: 'headshot',
  totalHours: 5,
  numPros: 1,
  totalAppointments: 25,
  appTime: 12,
  proHourly: 400,
  hourlyRate: 0,
  earlyArrival: 0,
  retouchingCost: 40,
  serviceCost: 2000,
};

const sampleMindfulness: ServiceCardService = {
  serviceType: 'mindfulness',
  serviceCost: 1350,
  classLength: 60,
  participants: 'unlimited',
  mindfulnessServiceName: 'Intro to Mindfulness',
  mindfulnessFormat: 'in-person',
};

const sampleMassageWithVariants: ServiceCardService = {
  ...sampleMassage,
  serviceCost: 1890,
  totalHours: 7,
  totalAppointments: 42,
  pricingOptions: [
    {
      name: 'Half day',
      totalHours: 4,
      numPros: 2,
      totalAppointments: 24,
      serviceCost: 1080,
      discountPercent: 0,
    },
    {
      name: 'Full day',
      totalHours: 7,
      numPros: 2,
      totalAppointments: 42,
      serviceCost: 1890,
      discountPercent: 0,
    },
    {
      name: 'Full day + extra therapist',
      totalHours: 7,
      numPros: 3,
      totalAppointments: 63,
      serviceCost: 2835,
      discountPercent: 5,
    },
  ],
  selectedOption: 1,
};

const sampleNails: ServiceCardService = {
  serviceType: 'nails',
  totalHours: 6,
  numPros: 4,
  totalAppointments: 48,
  appTime: 30,
  hourlyRate: 135,
  proHourly: 50,
  earlyArrival: 25,
  serviceCost: 3240,
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 56 }}>
    <SectionLabel
      eyebrow="Preview"
      title={title}
      size="section"
      mb={20}
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
  </section>
);

const RedesignPreview: React.FC = () => {
  // Interactive state for the ServiceCard demo
  const [massageIncluded, setMassageIncluded] = useState(true);
  const [massageFreq, setMassageFreq] = useState(1);
  const [headshotIncluded, setHeadshotIncluded] = useState(true);
  const [headshotFreq, setHeadshotFreq] = useState(2);
  const [mindIncluded, setMindIncluded] = useState(true);
  const [mindFreq, setMindFreq] = useState(4);
  const [variantsIncluded, setVariantsIncluded] = useState(true);
  const [variantsFreq, setVariantsFreq] = useState(1);
  const [variantsSelected, setVariantsSelected] = useState(1);
  const [nailsIncluded, setNailsIncluded] = useState(false); // demo: excluded state
  const [nailsFreq, setNailsFreq] = useState(1);

  const [collapseOpen, setCollapseOpen] = useState(true);
  const [toggleOn, setToggleOn] = useState(true);
  const [demoFreq, setDemoFreq] = useState(4);

  return (
    <div
      className="pv-page pv-page--client"
      style={{ minHeight: '100vh', padding: '40px 24px', background: T.beige }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: 48 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Phase 1 · Visual review</Eyebrow>
          <h1
            style={{
              fontFamily: T.fontD,
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: T.navy,
              margin: 0,
            }}
          >
            Redesign primitives + Service Card
          </h1>
          <p
            style={{
              fontFamily: T.fontD,
              fontSize: 16,
              color: T.fgMuted,
              lineHeight: 1.55,
              marginTop: 16,
              maxWidth: 700,
            }}
          >
            Temporary preview route for the redesigned proposal viewer. None of
            these components are wired into the real viewers yet — this page just
            renders them with sample data so we can iterate on look, behavior,
            and copy.
          </p>
        </div>

        {/* ServiceCard variants */}
        <Section title="Service Card — interactive">
          <ServiceCard
            service={sampleMassage}
            included={massageIncluded}
            frequency={massageFreq}
            onToggleInclude={setMassageIncluded}
            onChangeFrequency={setMassageFreq}
          />
          <ServiceCard
            service={sampleHeadshot}
            included={headshotIncluded}
            frequency={headshotFreq}
            onToggleInclude={setHeadshotIncluded}
            onChangeFrequency={setHeadshotFreq}
          />
          <ServiceCard
            service={sampleMindfulness}
            included={mindIncluded}
            frequency={mindFreq}
            onToggleInclude={setMindIncluded}
            onChangeFrequency={setMindFreq}
          />
        </Section>

        <Section title="Service Card — with pricing-options variants">
          <ServiceCard
            service={sampleMassageWithVariants}
            included={variantsIncluded}
            frequency={variantsFreq}
            onToggleInclude={setVariantsIncluded}
            onChangeFrequency={setVariantsFreq}
            onSelectPricingOption={setVariantsSelected}
          />
        </Section>

        <Section title="Service Card — excluded state (greyed + strikethrough title)">
          <ServiceCard
            service={sampleNails}
            included={nailsIncluded}
            frequency={nailsFreq}
            onToggleInclude={setNailsIncluded}
            onChangeFrequency={setNailsFreq}
          />
        </Section>

        <Section title="Service Card — edit mode (staff/admin, internalView)">
          <ServiceCard
            service={sampleMassage}
            editing={true}
            internalView={true}
            included={true}
            frequency={1}
            showSelectionControls={false}
            onFieldChange={() => {}}
          />
        </Section>

        {/* Primitives */}
        <Section title="Status pills">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <StatusPill status="draft" />
            <StatusPill status="sent" />
            <StatusPill status="pending_review" />
            <StatusPill status="has_changes" />
            <StatusPill status="approved" />
          </div>
        </Section>

        <Section title="Service-type chips">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              'massage',
              'headshot',
              'mindfulness',
              'facial',
              'nails',
              'hair',
              'hair-makeup',
            ].map((t) => (
              <ServiceTypeChip key={t} serviceType={t} />
            ))}
          </div>
        </Section>

        <Section title="Mini-stats">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
              gap: 12,
              maxWidth: 760,
            }}
          >
            <MiniStat label="Locations" value="2" accent="navy" />
            <MiniStat label="Event dates" value="4" accent="navy" />
            <MiniStat label="Appointments" value="312" accent="navy" />
            <MiniStat label="Total" value="$24,720" accent="coral" />
          </div>
        </Section>

        <Section title="Toggle + frequency picker (standalone)">
          <div
            style={{
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              padding: 22,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              flexWrap: 'wrap',
            }}
          >
            <ToggleSwitch
              on={toggleOn}
              onChange={setToggleOn}
              label={toggleOn ? 'Included' : 'Excluded'}
            />
            <FrequencyPicker value={demoFreq} onChange={setDemoFreq} />
            <span style={{ fontFamily: T.fontD, color: T.fgMuted, fontSize: 14 }}>
              Current: {toggleOn ? 'included' : 'excluded'}, frequency {demoFreq}
            </span>
          </div>
        </Section>

        <Section title="Collapse row (Location header)">
          <CollapseHead
            open={collapseOpen}
            onClick={() => setCollapseOpen((o) => !o)}
            left={
              <div>
                <Eyebrow style={{ marginBottom: 2 }}>Location · NYC office</Eyebrow>
                <CardHeading size="item">8th floor lounge</CardHeading>
              </div>
            }
            right={
              <span style={{ fontFamily: T.fontUi, fontWeight: 700, fontSize: 13, color: T.navy }}>
                2 dates · 3 services · $4,320
              </span>
            }
          />
        </Section>

        <Section title="Param grid stand-alone (ParamCell)">
          <div
            style={{
              background: '#fff',
              padding: 22,
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              maxWidth: 640,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
                gap: '16px 24px',
              }}
            >
              <ParamCell label="Appointments" value="24" />
              <ParamCell label="Total hours" value="4h" />
              <ParamCell label="# of pros" value="2" />
              <ParamCell label="App time" value="20 min" />
              <ParamCell label="Hourly rate" value="$135" />
              <ParamCell label="Early arrival" value="$25" />
            </div>
          </div>
        </Section>

        <div
          style={{
            marginTop: 48,
            padding: 22,
            background: '#fff',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Eyebrow style={{ marginBottom: 8 }}>Next phase</Eyebrow>
          <p
            style={{
              fontFamily: T.fontD,
              fontSize: 15,
              color: T.fgMuted,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Phase 2 wires these components into the real{' '}
            <code>StandaloneProposalViewer</code>: hero, options tabs, 2-col body
            with Live Total sidebar, pricing summary, approve flow.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RedesignPreview;
