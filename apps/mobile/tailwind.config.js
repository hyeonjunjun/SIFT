/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: This preset is often required for NativeWind v4
    presets: [require("nativewind/preset")],
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // The Canvas
                canvas: {
                    DEFAULT: '#FDFCF8', // Oatmeal
                    card: 'rgba(253, 252, 248, 0.85)', // Glass
                },
                // The Ink
                ink: {
                    DEFAULT: '#1C1C1E', // Soft Black
                    secondary: '#666666',  // Medium Gray
                    tertiary: '#A1A1A1',   // Muted Warm Gray
                },
                // The Borders
                border: {
                    DEFAULT: 'rgba(0,0,0,0.06)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'System'],
                serif: ['Georgia', 'Times New Roman', 'serif'], // Added Serif
                mono: ['Menlo', 'SF Mono', 'Courier New', 'monospace'],
            },
            borderRadius: {
                DEFAULT: '6px',
                'md': '8px',
            }
        },
    },
    plugins: [],
}
