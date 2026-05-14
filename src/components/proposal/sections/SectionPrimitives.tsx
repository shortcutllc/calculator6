import React from 'react';
import {
  Award,
  Brain,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  Image as ImageIcon,
  Palette,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { T } from '../shared/primitives';
import type { SectionIconName } from './serviceContent';

// Shared icon-resolver + a couple of stylistic helpers used by every section
// renderer (Why Shortcut, Service Details, Participant Benefits, etc.). Keeps
// the icon import surface in one place + ensures every icon swatch uses the
// V2 palette.

const ICONS: Record<SectionIconName, React.ComponentType<any>> = {
  Heart,
  Sparkles,
  Users,
  Shield,
  Clock,
  CheckCircle,
  Camera,
  Image: ImageIcon,
  Brain,
  FileText,
  Award,
  Palette,
};

interface IconSwatchProps {
  name: SectionIconName;
  size?: number;
  /** Override the default V2 swatch background */
  bg?: string;
  /** Override the icon stroke color */
  color?: string;
}
export const IconSwatch: React.FC<IconSwatchProps> = ({
  name,
  size = 24,
  bg = T.aqua,
  color = T.navy,
}) => {
  const Comp = ICONS[name] || Sparkles;
  return (
    <div
      style={{
        width: size + 16,
        height: size + 16,
        borderRadius: 10,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Comp size={size} color={color} strokeWidth={2.25} />
    </div>
  );
};

// Small green-dot bullet used in Why Shortcut bullet lists.
export const DotBullet: React.FC<{ color?: string }> = ({ color }) => (
  <div
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color || T.success,
      marginTop: 10,
      flexShrink: 0,
    }}
  />
);
