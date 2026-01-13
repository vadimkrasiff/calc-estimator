// tailwind.config.js
export default {
  content: [
    './index.html', // ← если есть
    './src/**/*.{js,ts,jsx,tsx}', // ← твои компоненты
    './src/**/*.{ts,tsx}', // ← добавь если не находит
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  important: true,
};
