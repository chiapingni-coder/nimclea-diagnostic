/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",   // 蓝
        success: "#10b981",   // 绿
        warning: "#f59e0b",   // 黄
        danger: "#ef4444",    // 红
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 10px 25px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};