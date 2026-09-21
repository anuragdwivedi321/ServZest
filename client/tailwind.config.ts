import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #f0fdfa)',
          100: 'var(--brand-100, #ccfbf1)',
          200: 'var(--brand-200, #99f6e4)',
          300: 'var(--brand-300, #5eead4)',
          400: 'var(--brand-400, #2dd4bf)',
          500: 'var(--brand-500, #14b8a6)',
          600: 'var(--brand-600, #0d9488)', // Primary Brand Teal
          700: 'var(--brand-700, #0f766e)', // Hover / Dark Accent
          800: 'var(--brand-800, #115e59)',
          900: 'var(--brand-900, #134e4a)',
          950: 'var(--brand-950, #042f2e)',
        },
        surface: {
          ground: 'var(--surface-ground, #f8fafc)', // Neutral off-white / light slate
          card: 'var(--surface-card, #ffffff)',     // Crisp white card
          border: 'var(--surface-border, #e2e8f0)', // Subtle border
          muted: 'var(--surface-muted, #f1f5f9)',   // Subtle chip background
        },
      },
    },
  },
  plugins: [],
};
export default config;
