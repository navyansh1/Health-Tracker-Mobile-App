// ============================================================================
// INSIGHTS ENGINE - Rule-Based Nutrition Pattern Detection
// Max 3 insights per week, neutral/encouraging tone
// ============================================================================
import { subDays, parseISO, getDay, isAfter } from "date-fns";

export function generateWeeklyInsights(meals = [], dailyGoals = { calories: 2000, protein: 50 }) {
    if (meals.length < 3) return [];

    const twoWeeksAgo = subDays(new Date(), 14);
    const recentMeals = meals.filter((m) => {
        try { return isAfter(parseISO(m?.date), twoWeeksAgo); } catch { return false; }
    });

    if (recentMeals.length < 3) return [];

    const insights = [];
    const mealsByDay = {};
    recentMeals.forEach((m) => {
        if (!m?.date) return;
        if (!mealsByDay[m.date]) mealsByDay[m.date] = [];
        mealsByDay[m.date].push(m);
    });

    const dayStats = Object.entries(mealsByDay).map(([date, dayMeals]) => ({
        date, isWeekend: [0, 6].includes(getDay(parseISO(date))),
        calories: dayMeals.reduce((s, m) => s + (m?.calories || 0), 0),
        protein: dayMeals.reduce((s, m) => s + (m?.protein || 0), 0),
        mealCount: dayMeals.length,
        hasBreakfast: dayMeals.some((m) => m?.meal_type === "Breakfast"),
    }));

    // Weekend vs Weekday pattern
    const weekdays = dayStats.filter((d) => !d.isWeekend && d.calories > 0);
    const weekends = dayStats.filter((d) => d.isWeekend && d.calories > 0);
    if (weekdays.length >= 2 && weekends.length >= 1) {
        const avgWD = weekdays.reduce((s, d) => s + d.calories, 0) / weekdays.length;
        const avgWE = weekends.reduce((s, d) => s + d.calories, 0) / weekends.length;
        if ((avgWE - avgWD) / avgWD > 0.2) {
            insights.push({ title: "Weekend Pattern", message: "Calories tend to spike on weekends — this is common." });
        }
    }

    // Protein pattern
    const daysWithProtein = dayStats.filter((d) => d.protein > 0);
    if (daysWithProtein.length >= 3) {
        const lowDays = daysWithProtein.filter((d) => d.protein < dailyGoals.protein * 0.7);
        if (lowDays.length >= daysWithProtein.length * 0.6) {
            insights.push({ title: "Protein Opportunity", message: "Protein intake is consistently low — adding protein-rich snacks could help." });
        } else if (lowDays.length <= daysWithProtein.length * 0.2) {
            insights.push({ title: "Protein Champion", message: "You're consistently hitting your protein goals." });
        }
    }

    // Meal distribution
    const mealTotals = recentMeals.reduce((a, m) => {
        a[m?.meal_type || "Snack"] = (a[m?.meal_type] || 0) + (m?.calories || 0);
        return a;
    }, {});
    const total = Object.values(mealTotals).reduce((a, b) => a + b, 0);
    if (total > 0 && mealTotals.Dinner / total > 0.45) {
        insights.push({ title: "Evening Eater", message: "Most of your calories come from dinner — spreading meals may help energy levels." });
    }

    return insights.slice(0, 3);
}

export function formatInsightsForDisplay(insights) {
    return insights.map((i) => ({ ...i, color: i.emoji === "💪" ? "#10B981" : "#6B7280" }));
}
