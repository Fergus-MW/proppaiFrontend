import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * PropertyBlurb Color System
         * 
         * This color system uses semantic naming to make it easier to update colors
         * throughout the application. The original color names are preserved for
         * backward compatibility, but new development should use the semantic names.
         * 
         * Examples:
         * - Use `bg-primary` instead of `bg-murrey`
         * - Use `text-secondary` instead of `text-pale-purple`
         * - Use `bg-background-dark` instead of `bg-night`
         * - Use `border-neutral` instead of `border-ash-gray`
         * 
         * Color variants include:
         * - primary/secondary: Main brand colors
         * - background/foreground: For content areas
         * - neutral: For gray tones
         * - error/success/warning: For status indicators
         */
        
        // Original colors (preserved for backward compatibility)
        murrey: "#8b004b",
        night: "#001427",
        "pale-purple": "#dbdbdb",
        "ash-gray": "#b0b5b3",
        "tea-green": "#dbdbdb", // Mapped to platinum as closest light color

        // Semantic color system
        primary: "#8b004b", // murrey
        "primary-light": "#8b004b", // murrey (same as base for consistency)
        "primary-dark": "#001427", // oxford-blue for darker variant
        secondary: "#dbdbdb", // platinum
        "secondary-dark": "#b0b5b3", // silver
        background: "#dbdbdb", // platinum
        "background-dark": "#001427", // oxford-blue
        foreground: "#b0b5b3", // silver
        neutral: "#b0b5b3", // silver
        "neutral-light": "#dbdbdb", // platinum
        "neutral-dark": "#001427", // oxford-blue
        card: "#dbdbdb", // platinum
        error: "#0075a2", // cerulean (keeping your assignment)
        "error-light": "#dbdbdb", // platinum
        "error-dark": "#8b004b", // murrey (as darker error variant)
        success: "#0075a2", // cerulean (keeping your assignment)
        "success-light": "#dbdbdb", // platinum
        warning: "#0075a2", // cerulean (keeping your assignment)
        "warning-light": "#dbdbdb", // platinum
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--foreground)",
            a: {
              color: "var(--primary)",
              "&:hover": {
                color: "var(--primary)",
                textDecoration: "underline",
              },
            },
            strong: {
              color: "var(--foreground)",
            },
            code: {
              color: "var(--foreground)",
              backgroundColor: "rgba(102, 102, 102, 0.2)",
              borderRadius: "0.25rem",
              padding: "0.125rem 0.25rem",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            pre: {
              backgroundColor: "rgba(102, 102, 102, 0.1)",
              code: {
                backgroundColor: "transparent",
                padding: "0",
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
export default config;
