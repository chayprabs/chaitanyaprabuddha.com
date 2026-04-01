/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}"
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            code: {
              fontWeight: "400",
              backgroundColor: "rgb(243 244 246)",
              borderRadius: "0.25rem",
              paddingLeft: "0.375rem",
              paddingRight: "0.375rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem"
            },
            pre: {
              backgroundColor: "transparent",
              padding: "0"
            },
            "pre code": {
              backgroundColor: "transparent"
            },
            a: {
              textDecoration: "none",
              fontWeight: "500"
            },
            "a:hover": {
              textDecoration: "underline"
            },
            ".anchor-heading": {
              textDecoration: "none",
              color: "inherit"
            }
          }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

module.exports = config;
