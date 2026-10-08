/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // VeriLoop design system
        // Base: deep midnight blue-grey
        surface: {
          0: '#080C12',
          1: '#0D1220',
          2: '#111827',
          3: '#1A2535',
          4: '#243045',
        },
        // Accent: electric cyan-teal
        accent: {
          50: '#E0F9FF',
          100: '#BAF3FF',
          200: '#7DE9FF',
          300: '#38D9F5',
          400: '#0DC7E5',
          500: '#00AFCC',
          600: '#008FAA',
          700: '#007088',
          800: '#005466',
          900: '#003A47',
        },
        // Status colors
        verified: '#10B981',
        warning: '#F59E0B',
        critical: '#EF4444',
        blocked: '#F97316',
        // Text
        ink: {
          primary: '#F0F4FA',
          secondary: '#9BA8BA',
          muted: '#5A6A7E',
          disabled: '#3A4A5E',
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23243045' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(13, 199, 229, 0.15)',
        'glow-cyan-sm': '0 0 10px rgba(13, 199, 229, 0.10)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
