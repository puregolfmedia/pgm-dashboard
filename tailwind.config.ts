import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pgm: {
          green:  '#006648',
          cream:  '#F4F1E8',
          silver: '#C6C6C6',
          ink:    '#1A2E22',
        },
      },
      fontFamily: {
        sans: ['Calibri', 'Trebuchet MS', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
