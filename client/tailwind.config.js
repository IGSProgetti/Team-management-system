/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trello-inspired color palette
        trello: {
          blue: '#0079bf',
          darkBlue: '#026aa7',
          lightBlue: '#70b5f9',
          green: '#61bd4f',
          yellow: '#f2d600',
          orange: '#ff9f1a',
          red: '#eb5a46',
          purple: '#c377e0',
          gray: '#8c8c8c',
          darkGray: '#4d4d4d',
        },
        // Sistema colori per stati
        status: {
          pending: '#f39c12',
          inProgress: '#3498db',
          completed: '#27ae60',
          overdue: '#e74c3c',
        }
      },
      fontFamily: {
        'display': ['Nunito', 'system-ui', 'sans-serif'],
        'body': ['Open Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'modal': '0 20px 40px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
