/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D85A30',
          light:   '#FF8C5A',
          dark:    '#993C1D',
        },
        dark: {
          base:     '#0A0A0A',
          surface:  '#111111',
          elevated: '#1A1A1A',
          input:    '#141414',
          border:   '#1E1E1E',
          border2:  '#2A2A2A',
        },
        light: {
          base:     '#F5F5F7',
          surface:  '#FFFFFF',
          border:   '#F0F0F0',
          border2:  '#E5E5E5',
        },
        avail: {
          now:     '#1D9E75',
          today:   '#378ADD',
          weekend: '#EF9F27',
          none:    '#555555',
        },
      },
    },
  },
  plugins: [],
}
