/** @type {import('tailwindcss').Config} */

/*
 * Industrial-loft theme.
 *
 * The app was built with Tailwind's default `gray` (cool slate) scale and
 * `yellow` as the brand accent, used as literal utilities across ~25 files.
 * Rather than rewrite every component, we REMAP those named scales to a warm
 * palette so the whole UI reskins at once and stays cohesive:
 *
 *   gray    -> warm espresso / stone neutrals (backgrounds + ivory text)
 *   yellow  -> copper / amber accent
 *   blue    -> muted steel (window-frame feel; only a few uses)
 *   green   -> sage / olive  (success)
 *   red     -> terracotta / brick (danger)
 *   emerald -> sage (progress "complete")
 *
 * Every shade that appears in the codebase is defined here; do not drop one
 * without checking usage, or that utility will render unstyled.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Display/headings: characterful modern-vintage serif (was Cinzel).
        lotr: ["Fraunces", "Georgia", "serif"],
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm neutral ramp (espresso -> cream). Low numbers = light text,
        // high numbers = dark surfaces, matching Tailwind's gray orientation.
        gray: {
          50: "#F7F2EA",
          100: "#EEE4D5", // primary text (warm ivory)
          200: "#DECFB9",
          300: "#C3B199", // secondary text
          400: "#9D8A72", // muted / tertiary text
          500: "#776552",
          600: "#574A3C", // hairline borders on warm surfaces
          700: "#3D342A", // hover surface / stronger border
          800: "#2A2219", // elevated surface
          900: "#1E1811", // card / panel surface
          950: "#15100B", // page background (deepest)
        },
        // Copper / amber accent ramp (was yellow).
        yellow: {
          50: "#FBF4E8",
          100: "#F3E3C6", // light cream-amber text
          200: "#E9CF9E",
          300: "#DCB173", // lighter amber (hover of primary)
          400: "#CB8A4C", // PRIMARY accent — warm copper/amber
          500: "#AE6E30", // deep copper
          600: "#8C5420", // rust
        },
        // Muted steel (was blue) — reads like dark window framing.
        blue: {
          100: "#D5DCE0",
          400: "#7C8B95",
          500: "#5E6E78",
        },
        // Sage / olive success (was green).
        green: {
          200: "#CBD8B8",
          400: "#8FA86A",
          500: "#6E8A47",
          600: "#5A7439",
        },
        emerald: {
          500: "#6E8A47",
        },
        // Terracotta / brick danger (was red) — still clearly a warning.
        red: {
          100: "#F3D8CF",
          200: "#E8BCAE",
          300: "#DB9683",
          400: "#CC6F56",
          500: "#B8543B",
          600: "#9E4530",
        },
      },
    },
  },
  plugins: [],
};
