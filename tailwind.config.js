/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ide: {
          shell: 'rgb(var(--ide-shell) / <alpha-value>)',
          bg: 'rgb(var(--ide-bg) / <alpha-value>)',
          sidebar: 'rgb(var(--ide-sidebar) / <alpha-value>)',
          panel: 'rgb(var(--ide-panel) / <alpha-value>)',
          surface: 'rgb(var(--ide-surface) / <alpha-value>)',
          card: 'rgb(var(--ide-card) / <alpha-value>)',
          selected: 'rgb(var(--ide-selected) / <alpha-value>)',
          border: 'rgb(var(--ide-border) / <alpha-value>)',
          borderStrong: 'rgb(var(--ide-border-strong) / <alpha-value>)',
          hover: 'rgb(var(--ide-hover) / <alpha-value>)',
          text: 'rgb(var(--ide-text) / <alpha-value>)',
          strong: 'rgb(var(--ide-text-strong) / <alpha-value>)',
          muted: 'rgb(var(--ide-text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ide-text-subtle) / <alpha-value>)',
          focus: 'rgb(var(--ide-focus) / <alpha-value>)',
          accent: 'rgb(var(--ide-focus) / <alpha-value>)',
          cyan: 'rgb(var(--ide-cyan) / <alpha-value>)',
          emerald: 'rgb(var(--ide-emerald) / <alpha-value>)',
          amber: 'rgb(var(--ide-amber) / <alpha-value>)',
          rose: 'rgb(var(--ide-rose) / <alpha-value>)',
          purple: 'rgb(var(--ide-purple) / <alpha-value>)',
        },
      },
      borderRadius: {
        'ide-control': 'var(--ide-control-radius)',
        'ide-panel': 'var(--ide-panel-radius)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      minHeight: {
        'touch-target': '40px',
      },
    },
  },
  plugins: [],
};
