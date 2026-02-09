// ============================================================================
// THEMES - NutriSnap Color Theme System
// ============================================================================

// 🟢 Fresh Green (Default) - Healthy, calm, balanced
export const FRESH_GREEN = {
    id: "fresh_green",
    name: "Fresh Green",
    emoji: "🌿",
    primary: "#10B981",
    primaryDark: "#34D399",
    secondary: "#6EE7B7",
    accent: "#A7F3D0",
    gradient: ["#10B981", "#059669"],
    gradientDark: ["#10B981", "#047857"],
    bgLight: "#ECFDF5",
    bgDark: "#0F172A",
    cardLight: "#FFFFFF",
    cardDark: "#1E293B",
    chipLight: "#E5E7EB",
    chipDark: "#334155",
};

// 🌙 Dark Mode - Easy on the eyes at night
export const DARK_MODE = {
    id: "dark_mode",
    name: "Dark Mode",
    emoji: "🌙",
    primary: "#6366F1",
    primaryDark: "#818CF8",
    secondary: "#A5B4FC",
    accent: "#C7D2FE",
    gradient: ["#4F46E5", "#4338CA"],
    gradientDark: ["#6366F1", "#4F46E5"],
    bgLight: "#1E1B4B",
    bgDark: "#0F0D1A",
    cardLight: "#312E81",
    cardDark: "#1E1B4B",
    chipLight: "#4338CA",
    chipDark: "#3730A3",
};

// 🌅 Warm Sunset - Energetic and friendly
export const WARM_SUNSET = {
    id: "warm_sunset",
    name: "Warm Sunset",
    emoji: "🌅",
    primary: "#F97316",
    primaryDark: "#FB923C",
    secondary: "#FDBA74",
    accent: "#FED7AA",
    gradient: ["#F97316", "#EA580C"],
    gradientDark: ["#F97316", "#C2410C"],
    bgLight: "#FFF7ED",
    bgDark: "#1C1917",
    cardLight: "#FFFFFF",
    cardDark: "#292524",
    chipLight: "#FED7AA",
    chipDark: "#44403C",
};

// ⚪ Minimal Mono - Clean and distraction-free
export const MINIMAL_MONO = {
    id: "minimal_mono",
    name: "Minimal Mono",
    emoji: "⚪",
    primary: "#18181B",
    primaryDark: "#F4F4F5",
    secondary: "#71717A",
    accent: "#A1A1AA",
    gradient: ["#27272A", "#18181B"],
    gradientDark: ["#3F3F46", "#27272A"],
    bgLight: "#FAFAFA",
    bgDark: "#09090B",
    cardLight: "#FFFFFF",
    cardDark: "#18181B",
    chipLight: "#E4E4E7",
    chipDark: "#27272A",
};

// All themes collection
export const THEMES = {
    fresh_green: FRESH_GREEN,
    dark_mode: DARK_MODE,
    warm_sunset: WARM_SUNSET,
    minimal_mono: MINIMAL_MONO,
};

export const THEME_LIST = Object.values(THEMES);
export const THEME_IDS = Object.keys(THEMES);

// Get theme colors based on dark mode preference
export function getThemeColors(themeId, isDarkMode) {
    const theme = THEMES[themeId] || FRESH_GREEN;

    return {
        primary: isDarkMode ? theme.primaryDark : theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        gradient: isDarkMode ? theme.gradientDark : theme.gradient,
        bg: isDarkMode ? theme.bgDark : theme.bgLight,
        card: isDarkMode ? theme.cardDark : theme.cardLight,
        chip: isDarkMode ? theme.chipDark : theme.chipLight,
        text: isDarkMode ? "#FFFFFF" : "#1F2937",
        subText: isDarkMode ? "#9CA3AF" : "#6B7280",
        border: isDarkMode ? "#374151" : "#E5E7EB",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
    };
}
