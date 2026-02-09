// ============================================================================
// REPORTS SCREEN - NutriSnap Analytics & Insights
// ============================================================================
import React, { useState, useMemo } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Modal,
    Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, PieChart, BarChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, subDays, parseISO, isAfter, isBefore, startOfDay, eachDayOfInterval } from "date-fns";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

// ============================================================================
// TIME PERIOD SELECTOR (with Custom option)
// ============================================================================
const TimePeriodSelector = ({ selected, onSelect, onCustom, themeColors }) => {
    const periods = [
        { key: "7", label: "7D" },
        { key: "14", label: "14D" },
        { key: "30", label: "1M" },
        { key: "90", label: "3M" },
        { key: "180", label: "6M" },
        { key: "custom", label: "Custom" },
    ];

    return (
        <View style={styles.periodContainer}>
            {periods.map((period) => (
                <TouchableOpacity
                    key={period.key}
                    style={[
                        styles.periodChip,
                        {
                            backgroundColor:
                                selected === period.key ? themeColors.primary : themeColors.chip,
                        },
                    ]}
                    onPress={() => period.key === "custom" ? onCustom() : onSelect(period.key)}
                >
                    <Text
                        style={{
                            color: selected === period.key ? "#FFF" : themeColors.text,
                            fontWeight: selected === period.key ? "bold" : "normal",
                            fontSize: 13,
                        }}
                    >
                        {period.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

// ============================================================================
// INSIGHT CARD
// ============================================================================
const InsightCard = ({ text, themeColors }) => (
    <View style={[styles.insightCard, { backgroundColor: themeColors.chip }]}>
        <Text style={[styles.insightText, { color: themeColors.text }]}>{text}</Text>
    </View>
);

// ============================================================================
// CHART CARD WRAPPER
// ============================================================================
const ChartCard = ({ title, children, insight, themeColors }) => (
    <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.chartTitle, { color: themeColors.text }]}>{title}</Text>
        {children}
        {insight && (
            <InsightCard text={insight} themeColors={themeColors} />
        )}
    </View>
);

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyState = ({ themeColors }) => (
    <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            No Data Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.subText }]}>
            Start logging meals to see your nutrition trends and insights.
        </Text>
    </View>
);

// ============================================================================
// AI SUGGESTIONS SECTION
// ============================================================================
const NutritionSuggestions = ({ meals, dailyGoals, periodMeals, themeColors }) => {
    const suggestions = useMemo(() => {
        if (periodMeals.length < 3) return [];

        const result = [];
        const totalCalories = periodMeals.reduce((s, m) => s + (m?.calories || 0), 0);
        const totalProtein = periodMeals.reduce((s, m) => s + (m?.protein || 0), 0);
        const totalCarbs = periodMeals.reduce((s, m) => s + (m?.carbs || 0), 0);
        const totalFat = periodMeals.reduce((s, m) => s + (m?.fat || 0), 0);
        const daysCount = new Set(periodMeals.map(m => m?.date)).size || 1;
        const avgCalories = totalCalories / daysCount;
        const avgProtein = totalProtein / daysCount;
        const avgCarbs = totalCarbs / daysCount;
        const avgFat = totalFat / daysCount;

        // Calorie analysis
        if (avgCalories > dailyGoals.calories * 1.15) {
            const excess = Math.round(avgCalories - dailyGoals.calories);
            result.push({
                title: "Calorie Surplus Detected",
                text: `You're averaging ${Math.round(avgCalories)} cal/day, about ${excess} cal over your goal. Consider smaller portions or swapping one snack for a lower-calorie option.`,
                type: "warning",
            });
        } else if (avgCalories < dailyGoals.calories * 0.7 && avgCalories > 0) {
            result.push({
                title: "Low Calorie Intake",
                text: `Your average intake is ${Math.round(avgCalories)} cal/day, which is significantly under your goal. Make sure you're eating enough to support your energy needs.`,
                type: "warning",
            });
        } else if (avgCalories >= dailyGoals.calories * 0.85 && avgCalories <= dailyGoals.calories * 1.15) {
            result.push({
                title: "Calories On Track",
                text: `Great consistency! You're averaging ${Math.round(avgCalories)} cal/day, right around your goal of ${dailyGoals.calories}.`,
                type: "success",
            });
        }

        // Protein analysis
        if (avgProtein < dailyGoals.protein * 0.7) {
            const deficit = Math.round(dailyGoals.protein - avgProtein);
            result.push({
                title: "Increase Protein Intake",
                text: `You're about ${deficit}g short of your protein goal daily. Try adding eggs, Greek yogurt, chicken, or legumes to your meals.`,
                type: "suggestion",
            });
        } else if (avgProtein >= dailyGoals.protein) {
            result.push({
                title: "Protein Goal Met",
                text: `Excellent! You're consistently meeting your protein target of ${dailyGoals.protein}g per day.`,
                type: "success",
            });
        }

        // Fat analysis
        if (avgFat > dailyGoals.fat * 1.3) {
            result.push({
                title: "High Fat Intake",
                text: `Your fat intake averages ${Math.round(avgFat)}g/day (goal: ${dailyGoals.fat}g). Consider cooking methods like grilling or steaming instead of frying.`,
                type: "suggestion",
            });
        }

        // Meal distribution analysis
        const mealTypes = periodMeals.reduce((acc, m) => {
            acc[m?.meal_type || "Snack"] = (acc[m?.meal_type || "Snack"] || 0) + 1;
            return acc;
        }, {});

        const totalMeals = periodMeals.length;
        const snackRatio = (mealTypes.Snack || 0) / totalMeals;
        if (snackRatio > 0.4) {
            result.push({
                title: "Snack-Heavy Pattern",
                text: `${Math.round(snackRatio * 100)}% of your meals are snacks. Try replacing some snacks with balanced meals that include protein and vegetables.`,
                type: "suggestion",
            });
        }

        if (!mealTypes.Breakfast || mealTypes.Breakfast < daysCount * 0.3) {
            result.push({
                title: "Breakfast Often Missed",
                text: `You're skipping breakfast on most days. A protein-rich breakfast can help control hunger and improve energy levels throughout the day.`,
                type: "suggestion",
            });
        }

        // Carb-heavy check
        const carbCaloriePercent = (avgCarbs * 4) / (avgCalories || 1);
        if (carbCaloriePercent > 0.6) {
            result.push({
                title: "Carb-Heavy Diet",
                text: `About ${Math.round(carbCaloriePercent * 100)}% of your calories come from carbs. Balancing with more protein and healthy fats can help maintain steady energy.`,
                type: "suggestion",
            });
        }

        return result.slice(0, 5);
    }, [periodMeals, dailyGoals]);

    if (suggestions.length === 0) return null;

    const typeColors = {
        success: "#10B981",
        warning: "#F59E0B",
        suggestion: themeColors.primary,
    };

    return (
        <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.chartTitle, { color: themeColors.text }]}>Nutrition Suggestions</Text>
            <Text style={{ color: themeColors.subText, fontSize: 12, marginBottom: 12 }}>
                Based on your eating patterns
            </Text>
            {suggestions.map((s, i) => (
                <View key={i} style={[styles.suggestionCard, { backgroundColor: themeColors.chip }]}>
                    <View style={[styles.suggestionDot, { backgroundColor: typeColors[s.type] }]} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionTitle, { color: themeColors.text }]}>{s.title}</Text>
                        <Text style={[styles.suggestionText, { color: themeColors.subText }]}>{s.text}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

// ============================================================================
// MAIN REPORTS SCREEN COMPONENT
// ============================================================================
export default function ReportsScreen({
    meals = [],
    dailyGoals = { calories: 2000, protein: 50, carbs: 250, fat: 65 },
    themeColors = {},
    isDarkMode = false,
    onBack,
}) {
    const [period, setPeriod] = useState("7");
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(subDays(new Date(), 7));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [pickingDate, setPickingDate] = useState(null); // "start" or "end"

    // Filter meals for selected period
    const periodMeals = useMemo(() => {
        if (period === "custom") {
            const start = startOfDay(customStartDate);
            const end = startOfDay(customEndDate);
            return meals.filter((m) => {
                try {
                    const d = parseISO(m?.date);
                    return (isAfter(d, start) || format(d, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd')) &&
                           (isBefore(d, end) || format(d, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd'));
                } catch {
                    return false;
                }
            });
        }

        const days = parseInt(period);
        const startDate = subDays(new Date(), days);
        return meals.filter((m) => {
            try {
                return isAfter(parseISO(m?.date), startDate);
            } catch {
                return false;
            }
        });
    }, [meals, period, customStartDate, customEndDate]);

    // Generate daily data for the period
    const dailyData = useMemo(() => {
        let startDate, endDate;

        if (period === "custom") {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const days = parseInt(period);
            endDate = new Date();
            startDate = subDays(endDate, days - 1);
        }

        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

        return dateRange.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayMeals = meals.filter((m) => m?.date === dateStr);

            return {
                date: dateStr,
                label: format(date, "dd"),
                fullLabel: format(date, "EEE"),
                calories: dayMeals.reduce((sum, m) => sum + (m?.calories || 0), 0),
                protein: dayMeals.reduce((sum, m) => sum + (m?.protein || 0), 0),
                carbs: dayMeals.reduce((sum, m) => sum + (m?.carbs || 0), 0),
                fat: dayMeals.reduce((sum, m) => sum + (m?.fat || 0), 0),
                mealCount: dayMeals.length,
            };
        });
    }, [meals, period, customStartDate, customEndDate]);

    // Calculate insights
    const calorieInsight = useMemo(() => {
        const daysUnderGoal = dailyData.filter(
            (d) => d.calories > 0 && d.calories <= dailyGoals.calories
        ).length;
        const daysWithData = dailyData.filter((d) => d.calories > 0).length;

        if (daysWithData === 0) return null;

        if (daysUnderGoal === daysWithData) {
            return { text: "You stayed within your calorie goal every day this period." };
        } else if (daysUnderGoal >= daysWithData * 0.7) {
            return { text: `You stayed under your calorie goal on ${daysUnderGoal} of ${daysWithData} days logged.` };
        } else {
            return { text: `You exceeded your calorie goal on ${daysWithData - daysUnderGoal} days. Small adjustments can help.` };
        }
    }, [dailyData, dailyGoals.calories]);

    const proteinInsight = useMemo(() => {
        const daysMetProteinGoal = dailyData.filter(
            (d) => d.protein >= dailyGoals.protein
        ).length;
        const daysWithData = dailyData.filter((d) => d.protein > 0).length;

        if (daysWithData === 0) return null;

        const weekdays = dailyData.filter((_, i) => {
            const dayOfWeek = new Date(dailyData[i].date).getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5;
        });
        const weekends = dailyData.filter((_, i) => {
            const dayOfWeek = new Date(dailyData[i].date).getDay();
            return dayOfWeek === 0 || dayOfWeek === 6;
        });

        const avgWeekdayProtein = weekdays.length > 0
            ? weekdays.reduce((sum, d) => sum + d.protein, 0) / weekdays.length
            : 0;
        const avgWeekendProtein = weekends.length > 0
            ? weekends.reduce((sum, d) => sum + d.protein, 0) / weekends.length
            : 0;

        if (Math.abs(avgWeekdayProtein - avgWeekendProtein) > dailyGoals.protein * 0.3) {
            if (avgWeekdayProtein < avgWeekendProtein) {
                return { text: "Protein intake is lower on weekdays. Try adding a protein-rich snack." };
            } else {
                return { text: "Protein intake is lower on weekends. Meal prep might help." };
            }
        }

        if (daysMetProteinGoal >= daysWithData * 0.8) {
            return { text: "Great protein consistency! You're hitting your goals regularly." };
        } else {
            return { text: "Protein intake is inconsistent. Try to include protein in every meal." };
        }
    }, [dailyData, dailyGoals.protein]);

    const mealDistributionInsight = useMemo(() => {
        const totals = periodMeals.reduce(
            (acc, m) => {
                const type = m?.meal_type || "Snack";
                acc[type] = (acc[type] || 0) + (m?.calories || 0);
                return acc;
            },
            { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 }
        );

        const totalCals = Object.values(totals).reduce((a, b) => a + b, 0);
        if (totalCals === 0) return null;

        const highest = Object.entries(totals).reduce((a, b) =>
            a[1] > b[1] ? a : b
        );
        const percentage = Math.round((highest[1] / totalCals) * 100);

        return {
            text: `Most of your calories come from ${highest[0]} (${percentage}%).`
        };
    }, [periodMeals]);

    // Chart configurations
    const chartConfig = {
        backgroundColor: themeColors.card,
        backgroundGradientFrom: themeColors.card,
        backgroundGradientTo: themeColors.card,
        decimalPlaces: 0,
        color: (opacity = 1) => isDarkMode
            ? `rgba(255, 255, 255, ${opacity})`
            : `rgba(31, 41, 55, ${opacity})`,
        labelColor: (opacity = 1) => isDarkMode
            ? `rgba(156, 163, 175, ${opacity})`
            : `rgba(107, 114, 128, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: {
            r: "5",
            strokeWidth: "2",
            stroke: themeColors.primary,
        },
        propsForBackgroundLines: {
            stroke: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        },
    };

    // Prepare chart data (max 7 labels for readability)
    const chartSlice = dailyData.length > 7 ? dailyData.slice(-7) : dailyData;

    const caloriesChartData = {
        labels: chartSlice.map((d) => d.fullLabel),
        datasets: [
            {
                data: chartSlice.map((d) => d.calories || 0),
                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                strokeWidth: 3,
            },
            {
                data: new Array(chartSlice.length).fill(dailyGoals.calories),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 2,
                withDots: false,
            },
        ],
        legend: ["Calories", "Goal"],
    };

    const proteinChartData = {
        labels: chartSlice.map((d) => d.fullLabel),
        datasets: [
            {
                data: chartSlice.map((d) => d.protein || 0),
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
            },
        ],
    };

    // Meal distribution pie chart data
    const mealDistData = useMemo(() => {
        const totals = periodMeals.reduce(
            (acc, m) => {
                const type = m?.meal_type || "Snack";
                acc[type] = (acc[type] || 0) + (m?.calories || 0);
                return acc;
            },
            { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 }
        );

        const colors = {
            Breakfast: "#F59E0B",
            Lunch: "#10B981",
            Dinner: "#8B5CF6",
            Snack: "#EC4899",
        };

        return Object.entries(totals)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name,
                population: value,
                color: colors[name],
                legendFontColor: themeColors.text,
                legendFontSize: 12,
            }));
    }, [periodMeals, themeColors.text]);

    const hasData = periodMeals.length > 0;

    // Date picker handlers
    const handleDateChange = (event, selectedDate) => {
        if (event.type === "dismissed") {
            setPickingDate(null);
            return;
        }
        if (selectedDate) {
            if (pickingDate === "start") {
                setCustomStartDate(selectedDate);
            } else {
                setCustomEndDate(selectedDate);
            }
        }
        if (Platform.OS !== "ios") {
            setPickingDate(null);
        }
    };

    const openCustomPicker = () => {
        setPeriod("custom");
        setShowCustomPicker(true);
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={[styles.backText, { color: themeColors.primary, fontSize: 22 }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                        Reports
                    </Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* Time Period Selector */}
                <TimePeriodSelector
                    selected={period}
                    onSelect={(p) => { setPeriod(p); setShowCustomPicker(false); }}
                    onCustom={openCustomPicker}
                    themeColors={themeColors}
                />

                {/* Custom Date Range */}
                {period === "custom" && (
                    <View style={[styles.customDateContainer, { backgroundColor: themeColors.card }]}>
                        <Text style={[styles.customDateLabel, { color: themeColors.text }]}>Custom Range</Text>
                        <View style={styles.customDateRow}>
                            <TouchableOpacity
                                style={[styles.datePickerBtn, { backgroundColor: themeColors.chip }]}
                                onPress={() => setPickingDate("start")}
                            >
                                <Text style={{ color: themeColors.subText, fontSize: 11 }}>From</Text>
                                <Text style={{ color: themeColors.text, fontWeight: "600", fontSize: 14 }}>
                                    {format(customStartDate, "MMM d, yyyy")}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{ color: themeColors.subText, marginHorizontal: 8 }}>to</Text>
                            <TouchableOpacity
                                style={[styles.datePickerBtn, { backgroundColor: themeColors.chip }]}
                                onPress={() => setPickingDate("end")}
                            >
                                <Text style={{ color: themeColors.subText, fontSize: 11 }}>To</Text>
                                <Text style={{ color: themeColors.text, fontWeight: "600", fontSize: 14 }}>
                                    {format(customEndDate, "MMM d, yyyy")}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {pickingDate && (
                            <View style={styles.datePickerWrapper}>
                                <DateTimePicker
                                    value={pickingDate === "start" ? customStartDate : customEndDate}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "inline" : "default"}
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                    themeVariant={isDarkMode ? "dark" : "light"}
                                />
                                {Platform.OS === "ios" && (
                                    <TouchableOpacity
                                        style={[styles.doneDateBtn, { backgroundColor: themeColors.primary }]}
                                        onPress={() => setPickingDate(null)}
                                    >
                                        <Text style={{ color: "#FFF", fontWeight: "600" }}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {!hasData ? (
                    <EmptyState themeColors={themeColors} />
                ) : (
                    <>
                        {/* Daily Calories Trend */}
                        <ChartCard
                            title="Daily Calories Trend"
                            insight={calorieInsight?.text}
                            themeColors={themeColors}
                        >
                            <LineChart
                                data={caloriesChartData}
                                width={CHART_WIDTH}
                                height={200}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                                withInnerLines={true}
                                withOuterLines={false}
                                withShadow={false}
                                fromZero={true}
                            />
                        </ChartCard>

                        {/* Protein Consistency */}
                        <ChartCard
                            title="Protein Consistency"
                            insight={proteinInsight?.text}
                            themeColors={themeColors}
                        >
                            <BarChart
                                data={{
                                    labels: chartSlice.map((d) => d.fullLabel),
                                    datasets: [
                                        {
                                            data: chartSlice.map((d) => d.protein || 0),
                                        },
                                    ],
                                }}
                                width={CHART_WIDTH}
                                height={180}
                                chartConfig={{
                                    ...chartConfig,
                                    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                                }}
                                style={styles.chart}
                                withInnerLines={true}
                                fromZero={true}
                                showValuesOnTopOfBars={true}
                            />
                            <View style={styles.goalLine}>
                                <View style={[styles.dashedLine, { borderColor: themeColors.primary }]} />
                                <Text style={[styles.goalText, { color: themeColors.subText }]}>
                                    Goal: {dailyGoals.protein}g
                                </Text>
                            </View>
                        </ChartCard>

                        {/* Meal Type Distribution */}
                        {mealDistData.length > 0 && (
                            <ChartCard
                                title="Meal Type Distribution"
                                insight={mealDistributionInsight?.text}
                                themeColors={themeColors}
                            >
                                <View style={styles.pieContainer}>
                                    <PieChart
                                        data={mealDistData}
                                        width={CHART_WIDTH}
                                        height={180}
                                        chartConfig={chartConfig}
                                        accessor={"population"}
                                        backgroundColor={"transparent"}
                                        paddingLeft={"15"}
                                        center={[0, 0]}
                                        absolute
                                    />
                                </View>
                            </ChartCard>
                        )}

                        {/* AI Nutrition Suggestions */}
                        <NutritionSuggestions
                            meals={meals}
                            dailyGoals={dailyGoals}
                            periodMeals={periodMeals}
                            themeColors={themeColors}
                        />
                    </>
                )}

                {/* Bottom padding */}
                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    backText: {
        fontSize: 16,
        fontWeight: "600",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
    },
    periodContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    periodChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    customDateContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    customDateLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 12,
    },
    customDateRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    datePickerBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
    },
    datePickerWrapper: {
        marginTop: 12,
    },
    doneDateBtn: {
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
    },
    chartCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 16,
    },
    chart: {
        borderRadius: 12,
        marginHorizontal: -8,
    },
    insightCard: {
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    insightText: {
        fontSize: 13,
        lineHeight: 18,
    },
    goalLine: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        paddingHorizontal: 8,
    },
    dashedLine: {
        flex: 1,
        height: 0,
        borderBottomWidth: 2,
        borderStyle: "dashed",
        marginRight: 8,
    },
    goalText: {
        fontSize: 12,
        fontWeight: "500",
    },
    pieContainer: {
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    suggestionCard: {
        flexDirection: "row",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: "flex-start",
    },
    suggestionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
        marginRight: 12,
    },
    suggestionTitle: {
        fontWeight: "600",
        fontSize: 14,
        marginBottom: 4,
    },
    suggestionText: {
        fontSize: 13,
        lineHeight: 18,
    },
});
