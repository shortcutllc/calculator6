import ShortcutSection from '@/app/components/ShortcutSection';

export default function App() {
  const cards = [
    {
      id: 'reset-at-work',
      title: 'Reset at work',
      items: [
        { id: '1', text: 'Chair & table massage', boldText: 'massage' },
        { id: '2', text: 'Office grooming & self-care', boldText: 'self-care' },
        { id: '3', text: 'Headshots & confidence boosts', boldText: 'confidence boosts' },
        { id: '4', text: 'Pop-up wellness experiences', boldText: 'wellness' },
        { id: '5', text: 'On-site, zero planning required', boldText: 'zero planning' },
      ],
      description: 'Physical, on-site wellness experiences that help your team recharge and refocus.',
      color: {
        card: '#fcf2fe',
        cardBorder: 'rgba(0, 31, 31, 0.08)',
        checkbox: '#fde5ff',
        checkboxBorder: 'rgba(224, 99, 199, 0.36)',
        text: '#b8337a',
        ctaBg: '#fab8ff',
        ctaText: '#b8337a',
        iconBg: '#e063c7',
      },
      ctaText: 'Take a tour →',
    },
    {
      id: 'calm-delivered',
      title: 'Calm, delivered',
      items: [
        { id: '1', text: 'One vendor, multiple services', boldText: 'One vendor' },
        { id: '2', text: 'Easy scheduling & sign-ups', boldText: 'Easy' },
        { id: '3', text: 'Nationwide provider network', boldText: 'Nationwide' },
        { id: '4', text: 'Consistent quarterly programs', boldText: 'Consistent' },
        { id: '5', text: 'Zero admin headaches', boldText: 'Zero admin' },
      ],
      description: 'Operational simplicity and ease that remove friction from your day.',
      color: {
        card: '#f0f0ff',
        cardBorder: 'rgba(0, 31, 31, 0.08)',
        checkbox: '#e1e1fa',
        checkboxBorder: 'rgba(112, 112, 255, 0.36)',
        text: '#4533b8',
        ctaBg: '#b8b8ff',
        ctaText: '#4533b8',
        iconBg: '#7070ff',
      },
      ctaText: 'Take a tour →',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1729] flex items-center justify-center py-20 px-4">
      <ShortcutSection
        headline="Slack. Zoom. Shortcut.
One of these helps your team relax."
        subheadline="Real moments of calm at work: when you can focus, move fast, and actually feel good about what got done."
        cards={cards}
      />
    </div>
  );
}