/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Commonplace — Lochmara (primary blue)
        lochmara: {
          lightest: '#e5f1f9',
          lighter:  '#cce3f4',
          light:    '#4c9fdb',
          DEFAULT:  '#0077cc',
          dark:     '#005fa3',
          darker:   '#002f51',
          darkest:  '#00233d',
        },
        // Commonplace — Burning Orange (secondary / warning)
        orange: {
          lightest: '#fff0ea',
          lighter:  '#ffe1d6',
          light:    '#ff9771',
          DEFAULT:  '#ff6b35',
          dark:     '#cc552a',
          darker:   '#662a15',
          darkest:  '#4c200f',
        },
        // Commonplace — Apple (tertiary / success)
        apple: {
          lightest: '#f0f7ec',
          lighter:  '#e1f0da',
          light:    '#96cb7e',
          DEFAULT:  '#6ab547',
          dark:     '#549038',
          darker:   '#2a481c',
          darkest:  '#1f3615',
        },
        // Commonplace — Neutral / ink scale
        ink: {
          lightest: '#f2f2f2',
          lighter:  '#d9dad9',
          light:    '#b4b5b3',
          DEFAULT:  '#828481',
          dark:     '#50524f',
          darker:   '#1e211d',
          darkest:  '#050904',
        },
      },
      fontFamily: {
        heading: ['"Raleway"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body:    ['"Inter"',   '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono:    ['ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        button: '0.375rem',
        input:  '0.375rem',
        badge:  '0.375rem',
        tag:    '0.25rem',
        card:   '0.5rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(5,9,4,0.05)',
        sm: '0 1px 3px 0 rgba(5,9,4,0.08), 0 1px 2px -1px rgba(5,9,4,0.06)',
        md: '0 4px 12px -2px rgba(5,9,4,0.10), 0 2px 6px -2px rgba(5,9,4,0.06)',
        lg: '0 16px 40px -8px rgba(5,9,4,0.16)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4,0,0.2,1)',
        out:      'cubic-bezier(0,0,0.2,1)',
      },
    },
  },
  plugins: [],
};
