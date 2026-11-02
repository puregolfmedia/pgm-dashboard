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
        // Pure Golf Media brand: fairway green, gold, silver, white
        pgm: {
          green:  '#084724', // fairway — brand green
          deep:   '#06361B', // darker fairway, for text on light green
          gold:   '#B8913A', // progress, highlights, work-done markers
          cream:  '#EEF2EE', // table headers (cool, light green-grey)
          page:   '#F3F5F2', // page background
          line:   '#D9DFDA', // hairline rules
          silver: '#C6C6C6',
          ink:    '#142019',
        },
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
