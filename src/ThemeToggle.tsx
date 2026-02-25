import React from 'react';
import { useTheme } from './theme';

export function ThemeToggle() {
  const { mode, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      style={{
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
      }}
      title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
    >
      {mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
    </button>
  );
}

export default ThemeToggle;
