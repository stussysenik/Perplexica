import type { Config } from "tailwindcss";
import type { DefaultColors } from "tailwindcss/types/generated/colors";

const themeDark = (colors: DefaultColors) => ({
        50: "#0c0c0e", // deepest bg
        100: "#141416", // secondary bg, sidebar
        200: "#1e1e22", // borders, cards
        300: "#2a2a2e", // hover states
        400: "#52525b", // muted text
        500: "#a1a1aa", // secondary text
});

const themeLight = (colors: DefaultColors) => ({
        50: "#ffffff", // primary bg
        100: "#fafbfc", // secondary bg
        200: "#eef1f5", // borders, subtle
        300: "#d4d9e0", // stronger borders
        400: "#8b949e", // muted text
        500: "#57606a", // secondary text
});

const config: Config = {
        content: [
                "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
                "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
                "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        ],
        darkMode: "class",
        theme: {
                extend: {
                        borderColor: ({ colors }) => {
                                return {
                                        light: themeLight(colors),
                                        dark: themeDark(colors),
                                };
                        },
                        colors: ({ colors }) => {
                                const colorsDark = themeDark(colors);
                                const colorsLight = themeLight(colors);

                                return {
                                        dark: {
                                                primary: colorsDark[50],
                                                secondary: colorsDark[100],
                                                ...colorsDark,
                                        },
                                        light: {
                                                primary: colorsLight[50],
                                                secondary: colorsLight[100],
                                                ...colorsLight,
                                        },
                                };
                        },
                },
        },
        plugins: [
                require("@tailwindcss/typography"),
                require("@headlessui/tailwindcss")({ prefix: "headless" }),
        ],
};
export default config;
