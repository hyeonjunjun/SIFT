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
                    DEFAULT: '#F2F2F7', // Apple System Gray 6
                    card: '#FFFFFF',    // Pure white cards
                },
                // The Ink
                ink: {
                    DEFAULT: '#1C1C1E', // Soft Black (Apple Label)
                    secondary: '#3A3A3C',  // Darker gray
                },
                // The Borders
                border: {
                    DEFAULT: '#E5E5EA',
                }
            },
            fontFamily: {
                sans: ['Inter', 'System'],
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
