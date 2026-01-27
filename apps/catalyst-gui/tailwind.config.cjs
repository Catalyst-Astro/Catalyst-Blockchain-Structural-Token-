/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        card: 'var(--card)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms'
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.08)'
      },
      fontFamily: {
        display: ['"Manrope"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', '"Segoe UI"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
