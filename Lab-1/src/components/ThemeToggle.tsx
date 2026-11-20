import type { ReactElement } from 'react';
import type { ThemeChoice } from '../hooks/useTheme';
import { IconAuto, IconMoon, IconSun } from './Icons';

const OPTIONS: { value: ThemeChoice; label: string; icon: ReactElement }[] = [
  { value: 'system', label: 'Auto', icon: <IconAuto width={16} height={16} /> },
  { value: 'light', label: 'Light', icon: <IconSun width={16} height={16} /> },
  { value: 'dark', label: 'Dark', icon: <IconMoon width={16} height={16} /> },
];

interface Props {
  value: ThemeChoice;
  onChange: (value: ThemeChoice) => void;
}

/** Light / dark / follow-the-OS switch. */
export function ThemeToggle({ value, onChange }: Props) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
          title={`${o.label} theme`}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
