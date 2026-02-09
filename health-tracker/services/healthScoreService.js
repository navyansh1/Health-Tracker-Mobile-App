// ============================================================================
// HEALTH SCORE SERVICE - Daily Health Score (0-100)
// ============================================================================
import { format, isToday, parseISO } from "date-fns";

// ============================================================================
// SCORE LABELS
// ============================================================================
export const SCORE_LABELS = {
    GREAT: { min: 80, max: 100, label: "Great day", color: "#10B981" },
    GOOD: { min: 50, max: 79, label: "Good effort", color: "#F59E0B" },
    IMPROVE: { min: 0, max: 49, label: "Room to improve", color: "#EF4444" },
};

// ============================================================================
// GET SCORE LABEL
// ============================================================================
export function getScoreLabel(score) {
    if (score >= 80) return SCORE_LABELS.GREAT;
    if (score >= 50) return SCORE_LABELS.GOOD;
    return SCORE_LABELS.IMPROVE;
}

// ============================================================================
// CALCULATE DAILY HEALTH SCORE
// ============================================================================
/**
 * Calculates a daily health score (0-100) based on:
 * - Staying near calorie goal (40 points max)
 * - Meeting protein intake (35 points max)
 * - Logging meals consistently (25 points max)
 *
 * @param {Object} params
 * @param {Array} params.todaysMeals - Meals logged today
 * @param {Object} params.dailyGoals - { calories, protein, carbs, fat }
 * @param {number} params.currentStreak - Current logging streak
 * @returns {Object} { score, breakdown, label }
 */
export function calculateHealthScore({
    todaysMeals = [],
    dailyGoals = { calories: 2000, protein: 50, carbs: 250, fat: 65 },
    currentStreak = 0,
}) {
    const breakdown = {
        calories: 0,
        protein: 0,
        consistency: 0,
    };

    // Calculate today's totals
    const todaysTotals = {
        calories: todaysMeals.reduce((sum, m) => sum + (m?.calories || 0), 0),
        protein: todaysMeals.reduce((sum, m) => sum + (m?.protein || 0), 0),
        mealCount: todaysMeals.length,
    };

    // ========== 1. CALORIE SCORE (40 points max) ==========
    // Perfect score if within 10% of goal
    // Good score if within 20%
    // Penalty for going over or being too low
    if (todaysTotals.calories > 0) {
        const calorieDiff = Math.abs(todaysTotals.calories - dailyGoals.calories);
        const percentDiff = calorieDiff / dailyGoals.calories;

        if (percentDiff <= 0.05) {
            // Within 5% - perfect!
            breakdown.calories = 40;
        } else if (percentDiff <= 0.10) {
            // Within 10% - excellent
            breakdown.calories = 36;
        } else if (percentDiff <= 0.15) {
            // Within 15% - very good
            breakdown.calories = 32;
        } else if (percentDiff <= 0.20) {
            // Within 20% - good
            breakdown.calories = 26;
        } else if (percentDiff <= 0.30) {
            // Within 30% - okay
            breakdown.calories = 18;
        } else if (percentDiff <= 0.50) {
            // Within 50% - needs work
            breakdown.calories = 10;
        } else {
            // Way off
            breakdown.calories = 5;
        }

        // Extra penalty for significantly over goal (unhealthy overeating)
        if (todaysTotals.calories > dailyGoals.calories * 1.3) {
            breakdown.calories = Math.max(0, breakdown.calories - 10);
        }
    }

    // ========== 2. PROTEIN SCORE (35 points max) ==========
    // Meeting protein goal is important for health
    if (todaysTotals.protein > 0) {
        const proteinPercent = todaysTotals.protein / dailyGoals.protein;

        if (proteinPercent >= 1.0) {
            // Met or exceeded goal
            breakdown.protein = 35;
        } else if (proteinPercent >= 0.9) {
            breakdown.protein = 32;
        } else if (proteinPercent >= 0.8) {
            breakdown.protein = 28;
        } else if (proteinPercent >= 0.7) {
            breakdown.protein = 22;
        } else if (proteinPercent >= 0.5) {
            breakdown.protein = 15;
        } else if (proteinPercent >= 0.3) {
            breakdown.protein = 8;
        } else {
            breakdown.protein = 4;
        }
    }

    // ========== 3. CONSISTENCY SCORE (25 points max) ==========
    // Based on meal count today + current streak

    // Meal logging today (15 points)
    if (todaysTotals.mealCount >= 3) {
        // 3+ meals logged - great!
        breakdown.consistency = 15;
    } else if (todaysTotals.mealCount === 2) {
        breakdown.consistency = 12;
    } else if (todaysTotals.mealCount === 1) {
        breakdown.consistency = 8;
    }

    // Streak bonus (10 points)
    if (currentStreak >= 7) {
        breakdown.consistency += 10;
    } else if (currentStreak >= 3) {
        breakdown.consistency += 7;
    } else if (currentStreak >= 1) {
        breakdown.consistency += 4;
    }

    // ========== CALCULATE FINAL SCORE ==========
    const score = Math.min(
        100,
        breakdown.calories + breakdown.protein + breakdown.consistency
    );

    return {
        score: Math.round(score),
        breakdown,
        label: getScoreLabel(score),
        hasData: todaysTotals.mealCount > 0,
    };
}

// ============================================================================
// GET SCORE ENCOURAGEMENT MESSAGE
// ============================================================================
export function getScoreEncouragement(scoreData) {
    const { score, breakdown, hasData } = scoreData;

    if (!hasData) {
        return "Log your first meal to see your health score!";
    }

    const messages = [];

    // Score-based main message
    if (score >= 90) {
        messages.push("Outstanding! You're crushing it today.");
    } else if (score >= 80) {
        messages.push("Amazing work! Keep up the great habits.");
    } else if (score >= 70) {
        messages.push("You're doing well! A little more and you'll be at your best.");
    } else if (score >= 50) {
        messages.push("Good start! Small improvements lead to big results.");
    } else {
        messages.push("Every journey begins with a single step. You've got this.");
    }

    // Specific improvement suggestions
    if (breakdown.calories < 20 && breakdown.protein > 20) {
        messages.push("Try to balance your calorie intake closer to your goal.");
    } else if (breakdown.protein < 20 && breakdown.calories > 20) {
        messages.push("Add more protein to reach your target!");
    } else if (breakdown.consistency < 15) {
        messages.push("Log more meals to improve your consistency score.");
    }

    return messages[0]; // Return main message
}

// ============================================================================
// GET WEEKLY AVERAGE SCORE
// ============================================================================
export function calculateWeeklyAverageScore(weeklyMeals, dailyGoals) {
    // Group meals by day and calculate score for each day
    const mealsByDay = {};

    weeklyMeals.forEach((meal) => {
        if (!meal?.date) return;
        if (!mealsByDay[meal.date]) {
            mealsByDay[meal.date] = [];
        }
        mealsByDay[meal.date].push(meal);
    });

    const dailyScores = Object.values(mealsByDay).map((dayMeals) =>
        calculateHealthScore({
            todaysMeals: dayMeals,
            dailyGoals,
            currentStreak: 1, // Ignore streak for weekly calculation
        }).score
    );

    if (dailyScores.length === 0) return 0;

    return Math.round(
        dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length
    );
}
