/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          gray: '#8E8E93',
          gray2: '#AEAEB2',
          gray3: '#C7C7CC',
          gray4: '#D1D1D6',
          gray5: '#E5E5EA',
          gray6: '#F2F2F7',
          background: '#F2F2F7',
          backgroundDark: '#000000',
          grouped: {
            background: '#F2F2F7',
            backgroundDark: '#1C1C1E'
          }
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        'ios': '0 4px 30px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 10px 40px rgba(0, 0, 0, 0.12)',
        'ios-dark': '0 4px 30px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'ios': '12px',
        'ios-lg': '18px',
        'ios-xl': '24px',
      }
    },
  },
  plugins: [],
}
