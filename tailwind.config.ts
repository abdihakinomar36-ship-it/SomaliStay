import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#0E7A4F",
          "green-dark": "#0A5C3B",
          "green-light": "#E6F4EC",
          blue: "#1D63B3",
          "blue-dark": "#14498A",
          "blue-light": "#E8F0FA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
