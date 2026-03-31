/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // --- Color tokens (outline-first design system) ---
      colors: {
        // Semantic border tokens
        border: {
          DEFAULT: '#E5E5E5',
          accent: '#2563EB',
          highlight: '#10B981',
          muted: '#D4D4D4',
        },
        // Semantic text tokens
        text: {
          primary: '#111111',
          secondary: '#555555',
          muted: '#888888',
          accent: '#2563EB',
          highlight: '#10B981',
        },
        // Semantic surface tokens
        surface: {
          primary: '#FFFFFF',
          secondary: '#FAFAFA',
          whisper: 'rgba(37, 99, 235, 0.03)',
          'whisper-highlight': 'rgba(16, 185, 129, 0.03)',
        },
        // Legacy aliases (preserve existing class compatibility during migration)
        light: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          100: '#FFFFFF',
          200: '#E5E5E5',
          300: '#D4D4D4',
        },
        dark: {
          primary: '#111111',
          secondary: '#1A1A1A',
          100: '#252525',
          200: '#333333',
          300: '#444444',
        },
        accent: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
        },
        highlight: {
          DEFAULT: '#10B981',
          light: '#34D399',
        },
      },

      // --- Typography ---
      fontFamily: {
        sans: ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '600' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px', fontWeight: '400' }],
        small: ['13px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.05em' }],
      },

      // --- Spacing (8px baseline grid) ---
      spacing: {
        '1u': '8px',
        '2u': '16px',
        '3u': '24px',
        '4u': '32px',
        '5u': '40px',
        '6u': '48px',
      },

      // --- Border radius (minimal for outline system) ---
      borderRadius: {
        'spine': '4px',   // default component radius
        'card': '4px',    // SpineCard
      },

      // --- Border width (color spine) ---
      borderWidth: {
        spine: '3px',
      },

      // --- Grid template areas (content-driven layouts) ---
      gridTemplateAreas: {
        desktop: [
          'sidebar main toc',
        ],
        tablet: [
          'main',
        ],
        mobile: [
          'main',
          'bottomnav',
        ],
        search: [
          'sources',
          'answer',
        ],
        library: [
          'tabs',
          'list',
        ],
      },
      gridTemplateColumns: {
        desktop: '240px 1fr 200px',
        tablet: '1fr',
      },
      gridTemplateRows: {
        mobile: '1fr auto',
        search: 'auto 1fr',
        library: 'auto 1fr',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@savvywombat/tailwindcss-grid-areas'),
  ],
}
