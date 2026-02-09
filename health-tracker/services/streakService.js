// ============================================================================
// STREAK SERVICE - NutriSnap Streak & Badge System
// ============================================================================
import { format, subDays, parseISO, differenceInDays, isToday, isYesterday } from "date-fns";

// ============================================================================
// STREAK BADGES
// ============================================================================
export const BADGES = {
    STREAK_3: {
        id: "streak_3",
        name: "3-Day Streak",
        emoji: "🔥",
        description: "Keep the fire burning!",
        requirement: 3,
    },
    STREAK_7: {
        id: "streak_7",
        name: "Perfect Week",
        emoji: "⭐",
        description: "A full week of consistency!",
        requirement: 7,
    },
    STREAK_14: {
        id: "streak_14",
        name: "Two Week Champion",
        emoji: "🏆",
        description: "Two weeks strong!",
        requirement: 14,
    },
    STREAK_30: {
        id: "streak_30",
        name: "Monthly Master",
        emoji: "👑",
        description: "A full month of dedication!",
        requirement: 30,
    },
    BOUNCE_BACK: {
        id: "bounce_back",
        name: "Bounce Back",
        emoji: "🌱",
        description: "Started fresh after a break!",
        requirement: 1,
    },
};

// ============================================================================
// CALCULATE STREAK DATA
// ============================================================================
/**
 * Calculates the current streak, best streak, and badges based on meal data.
 * 
 * Rules:
 * - A day counts if at least one meal is logged
 * - Missing one day pauses the streak (can continue next day)
 * - Missing two consecutive days resets the streak
 * 
 * @param {Array} meals - Array of meal objects with date property
 * @returns {Object} { currentStreak, bestStreak, badges, streakStatus, lastLoggedDate }
 */
export function calculateStreakData(meals = []) {
    if (!meals.length) {
        return {
            currentStreak: 0,
            bestStreak: 0,
            badges: [],
            streakStatus: "no_data",
            lastLoggedDate: null,
            daysWithPause: 0,
        };
    }

    // Get unique dates with meals (sorted descending - most recent first)
    const datesWithMeals = [...new Set(meals.map((m) => m?.date).filter(Boolean))]
        .sort((a, b) => new Date(b) - new Date(a));

    if (datesWithMeals.length === 0) {
        return {
            currentStreak: 0,
            bestStreak: 0,
            badges: [],
            streakStatus: "no_data",
            lastLoggedDate: null,
            daysWithPause: 0,
        };
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const lastLoggedDate = datesWithMeals[0];

    // Determine current streak
    let currentStreak = 0;
    let streakStatus = "active";
    let daysWithPause = 0;

    // Check if streak is still active
    const hasLoggedToday = datesWithMeals.includes(today);
    const hasLoggedYesterday = datesWithMeals.includes(yesterday);
    const hasLoggedTwoDaysAgo = datesWithMeals.includes(twoDaysAgo);

    if (hasLoggedToday) {
        // Streak is definitely active
        streakStatus = "active";
    } else if (hasLoggedYesterday) {
        // Still within grace period (1 day pause allowed)
        streakStatus = "paused";
        daysWithPause = 1;
    } else if (hasLoggedTwoDaysAgo) {
        // Streak is broken (2 days missed)
        streakStatus = "broken";
        currentStreak = 0;
    } else {
        // Check how long ago the last log was
        const daysSinceLastLog = differenceInDays(new Date(), parseISO(lastLoggedDate));
        if (daysSinceLastLog >= 2) {
            streakStatus = "broken";
            currentStreak = 0;
        }
    }

    // Calculate current streak length
    if (streakStatus !== "broken") {
        // Start counting from yesterday if not logged today
        let checkDate = hasLoggedToday ? today : yesterday;
        let consecutiveDays = 0;
        let allowedMisses = 1; // Allow 1 miss in the streak

        for (let i = 0; i < 365; i++) {
            const dateToCheck = format(subDays(new Date(checkDate), i), "yyyy-MM-dd");

            if (datesWithMeals.includes(dateToCheck)) {
                consecutiveDays++;
            } else {
                if (allowedMisses > 0 && i > 0) {
                    allowedMisses--;
                    // Don't count this day but continue
                } else {
                    break;
                }
            }
        }
        currentStreak = consecutiveDays;
    }

    // Calculate best streak ever
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...datesWithMeals].sort((a, b) => new Date(a) - new Date(b));

    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const dayDiff = differenceInDays(currDate, prevDate);

            if (dayDiff === 1) {
                tempStreak++;
            } else if (dayDiff === 2) {
                // Allow 1 day gap (paused streak)
                tempStreak++;
            } else {
                // Streak broken
                tempStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak);
    }

    // Make sure current streak is also considered for best
    bestStreak = Math.max(bestStreak, currentStreak);

    // Determine earned badges
    const badges = [];

    // Streak-based badges
    if (currentStreak >= 3 || bestStreak >= 3) {
        badges.push(BADGES.STREAK_3);
    }
    if (currentStreak >= 7 || bestStreak >= 7) {
        badges.push(BADGES.STREAK_7);
    }
    if (currentStreak >= 14 || bestStreak >= 14) {
        badges.push(BADGES.STREAK_14);
    }
    if (currentStreak >= 30 || bestStreak >= 30) {
        badges.push(BADGES.STREAK_30);
    }

    // Bounce back badge - if user restarted after streak was broken
    if (streakStatus === "active" && currentStreak >= 1 && bestStreak > currentStreak) {
        badges.push(BADGES.BOUNCE_BACK);
    }

    return {
        currentStreak,
        bestStreak,
        badges,
        streakStatus,
        lastLoggedDate,
        daysWithPause,
    };
}

// ============================================================================
// STREAK STATUS MESSAGE
// ============================================================================
export function getStreakStatusMessage(streakData) {
    const { currentStreak, streakStatus, daysWithPause } = streakData;

    switch (streakStatus) {
        case "active":
            if (currentStreak >= 7) {
                return `${currentStreak} day streak — keep it going!`;
            } else if (currentStreak >= 3) {
                return `${currentStreak} day streak — nice consistency!`;
            } else if (currentStreak === 1) {
                return `Day 1 — great start!`;
            }
            return `${currentStreak} day streak`;

        case "paused":
            return `Streak paused — log a meal to continue`;

        case "broken":
            return `Start a new streak today`;

        case "no_data":
            return `Log your first meal to start a streak`;

        default:
            return "";
    }
}

// ============================================================================
// HELPER: Check if user logged today
// ============================================================================
export function hasLoggedToday(meals = []) {
    const today = format(new Date(), "yyyy-MM-dd");
    return meals.some((m) => m?.date === today);
}

// ============================================================================
// HELPER: Get days since last log
// ============================================================================
export function getDaysSinceLastLog(meals = []) {
    if (!meals.length) return null;

    const datesWithMeals = meals.map((m) => m?.date).filter(Boolean);
    if (!datesWithMeals.length) return null;

    const lastDate = datesWithMeals.sort((a, b) => new Date(b) - new Date(a))[0];
    return differenceInDays(new Date(), parseISO(lastDate));
}
