import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { brand: { green: "#138A62", blue: "#155E9A", navy: "#12324A", pale: "#F2FAF7" } } } },
  plugins: []
};
export default config;
