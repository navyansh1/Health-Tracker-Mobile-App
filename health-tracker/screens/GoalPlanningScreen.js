// ============================================================================
// GOAL PLANNING SCREEN - Weight Tracking & Fitness Goals
// ============================================================================
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Alert, Dimensions, Modal,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart } from "react-native-chart-kit";
import { format, subDays, parseISO } from "date-fns";
import {
    saveGoalPlan, getGoalPlan,
    saveWeightEntry, getWeightEntries, deleteWeightEntry,
    saveUserPreferences, getUserPreferences,
} from "../firestoreService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

// ============================================================================
// CONSTANTS
// ============================================================================
const FITNESS_GOALS = [
    { id: "lose_weight", label: "Lose Weight", description: "Calorie deficit for fat loss", icon: "(-)" },
    { id: "build_muscle", label: "Build Muscle", description: "Calorie surplus for muscle gain", icon: "(+)" },
    { id: "maintain", label: "Maintain Weight", description: "Stay at your current weight", icon: "(=)" },
    { id: "general_health", label: "General Health", description: "Balanced nutrition focus", icon: "(*)" },
];

const ACTIVITY_LEVELS = [
    { id: "sedentary", label: "Sedentary", description: "Little or no exercise", multiplier: 1.2 },
    { id: "light", label: "Lightly Active", description: "Light exercise 1-3 days/week", multiplier: 1.375 },
    { id: "moderate", label: "Moderately Active", description: "Moderate exercise 3-5 days/week", multiplier: 1.55 },
    { id: "very_active", label: "Very Active", description: "Hard exercise 6-7 days/week", multiplier: 1.725 },
];

const GENDER_OPTIONS = [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
];

const TIMELINE_OPTIONS = [
    { id: "30", label: "1 Month" },
    { id: "60", label: "2 Months" },
    { id: "90", label: "3 Months" },
    { id: "180", label: "6 Months" },
    { id: "365", label: "1 Year" },
];

// ============================================================================
// CALORIE CALCULATOR
// ============================================================================
function calculateTargets(plan) {
    if (!plan.weight || !plan.height || !plan.age || !plan.gender || !plan.activityLevel || !plan.fitnessGoal) {
        return null;
    }

    // Mifflin-St Jeor Equation for BMR
    let bmr;
    if (plan.gender === "male") {
        bmr = 10 * plan.weight + 6.25 * plan.height - 5 * plan.age + 5;
    } else {
        bmr = 10 * plan.weight + 6.25 * plan.height - 5 * plan.age - 161;
    }

    const activityData = ACTIVITY_LEVELS.find(a => a.id === plan.activityLevel);
    const tdee = Math.round(bmr * (activityData?.multiplier || 1.2));

    let targetCalories;
    let proteinPerKg;
    let explanation;

    switch (plan.fitnessGoal) {
        case "lose_weight":
            targetCalories = Math.round(tdee - 500); // 500 cal deficit
            proteinPerKg = 2.0; // Higher protein to preserve muscle
            explanation = "A 500 calorie deficit targets ~0.5 kg/week loss safely.";
            break;
        case "build_muscle":
            targetCalories = Math.round(tdee + 300); // 300 cal surplus
            proteinPerKg = 2.2; // High protein for muscle building
            explanation = "A 300 calorie surplus supports lean muscle growth.";
            break;
        case "maintain":
            targetCalories = tdee;
            proteinPerKg = 1.6;
            explanation = "Eating at maintenance keeps your weight stable.";
            break;
        case "general_health":
        default:
            targetCalories = tdee;
            proteinPerKg = 1.4;
            explanation = "Balanced nutrition for overall wellbeing.";
            break;
    }

    const targetProtein = Math.round(proteinPerKg * plan.weight);
    const proteinCalories = targetProtein * 4;
    const fatCalories = Math.round(targetCalories * 0.25);
    const targetFat = Math.round(fatCalories / 9);
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const targetCarbs = Math.round(carbCalories / 4);

    return {
        bmr: Math.round(bmr),
        tdee,
        targetCalories: Math.max(1200, targetCalories), // Never below 1200
        targetProtein,
        targetCarbs: Math.max(50, targetCarbs),
        targetFat: Math.max(30, targetFat),
        explanation,
    };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function GoalPlanningScreen({ themeColors, isDarkMode, onBack, dailyGoals, onUpdateGoals, setDailyGoals }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("plan"); // "plan" or "weight"

    // Goal plan state
    const [plan, setPlan] = useState({
        fitnessGoal: "",
        gender: "",
        age: "",
        height: "",
        weight: "",
        targetWeight: "",
        activityLevel: "",
        timeline: "90",
    });

    // Weight log state
    const [weightEntries, setWeightEntries] = useState([]);
    const [newWeight, setNewWeight] = useState("");
    const [showWeightInput, setShowWeightInput] = useState(false);

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [planResult, weightResult] = await Promise.all([
                getGoalPlan(),
                getWeightEntries(),
            ]);

            if (planResult.success && planResult.plan) {
                setPlan(prev => ({ ...prev, ...planResult.plan }));
            }
            if (weightResult.success) {
                setWeightEntries(weightResult.entries);
            }
        } catch (e) {
            console.log("Error loading goal data:", e);
        }
        setLoading(false);
    }

    // Calculate targets
    const targets = useMemo(() => calculateTargets({
        ...plan,
        weight: parseFloat(plan.weight) || 0,
        height: parseFloat(plan.height) || 0,
        age: parseInt(plan.age) || 0,
    }), [plan]);

    // Save plan
    async function handleSavePlan() {
        setSaving(true);
        try {
            await saveGoalPlan(plan);
            Alert.alert("Saved", "Your goal plan has been saved.");
        } catch (e) {
            Alert.alert("Error", "Could not save plan.");
        }
        setSaving(false);
    }

    // Apply targets to daily goals
    async function handleApplyTargets() {
        if (!targets) return;

        Alert.alert(
            "Apply to Daily Goals?",
            `This will update your daily goals to:\nCalories: ${targets.targetCalories}\nProtein: ${targets.targetProtein}g\nCarbs: ${targets.targetCarbs}g\nFat: ${targets.targetFat}g`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Apply",
                    onPress: async () => {
                        const newGoals = {
                            calories: targets.targetCalories,
                            protein: targets.targetProtein,
                            carbs: targets.targetCarbs,
                            fat: targets.targetFat,
                        };
                        if (onUpdateGoals) onUpdateGoals(newGoals);
                        Alert.alert("Applied", "Daily goals updated based on your plan.");
                    }
                }
            ]
        );
    }

    // Weight logging
    async function handleAddWeight() {
        const weight = parseFloat(newWeight);
        if (!weight || weight < 20 || weight > 300) {
            Alert.alert("Invalid Weight", "Please enter a valid weight (20-300 kg).");
            return;
        }

        try {
            await saveWeightEntry({ weight, unit: "kg" });
            setNewWeight("");
            setShowWeightInput(false);
            await loadData(); // Refresh
        } catch (e) {
            Alert.alert("Error", "Could not save weight entry.");
        }
    }

    // Weight chart data
    const weightChartData = useMemo(() => {
        if (weightEntries.length < 2) return null;

        const sorted = [...weightEntries]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-14); // Last 14 entries

        return {
            labels: sorted.map(e => format(parseISO(e.date), "dd/MM")),
            datasets: [{
                data: sorted.map(e => e.weight),
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                strokeWidth: 2,
            }],
        };
    }, [weightEntries]);

    const chartConfig = {
        backgroundColor: themeColors.card,
        backgroundGradientFrom: themeColors.card,
        backgroundGradientTo: themeColors.card,
        decimalPlaces: 1,
        color: (opacity = 1) => isDarkMode
            ? `rgba(255, 255, 255, ${opacity})`
            : `rgba(31, 41, 55, ${opacity})`,
        labelColor: (opacity = 1) => isDarkMode
            ? `rgba(156, 163, 175, ${opacity})`
            : `rgba(107, 114, 128, ${opacity})`,
        propsForDots: { r: "4", strokeWidth: "2", stroke: themeColors.primary },
        propsForBackgroundLines: { stroke: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={[styles.backText, { color: themeColors.primary, fontSize: 22 }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Goal Planning</Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: activeTab === "plan" ? themeColors.primary : themeColors.chip }]}
                        onPress={() => setActiveTab("plan")}
                    >
                        <Text style={{ color: activeTab === "plan" ? "#FFF" : themeColors.text, fontWeight: "600" }}>
                            My Plan
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: activeTab === "weight" ? themeColors.primary : themeColors.chip }]}
                        onPress={() => setActiveTab("weight")}
                    >
                        <Text style={{ color: activeTab === "weight" ? "#FFF" : themeColors.text, fontWeight: "600" }}>
                            Weight Log
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === "plan" ? (
                    <>
                        {/* Current Daily Goals - only in Plan tab */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Current Daily Goals</Text>
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Calories (kcal)</Text>
                                    <TextInput
                                        value={String(dailyGoals.calories || "")}
                                        onChangeText={t => setDailyGoals(prev => ({ ...prev, calories: parseInt(t) || 0 }))}
                                        keyboardType="numeric"
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Protein (g)</Text>
                                    <TextInput
                                        value={String(dailyGoals.protein || "")}
                                        onChangeText={t => setDailyGoals(prev => ({ ...prev, protein: parseInt(t) || 0 }))}
                                        keyboardType="numeric"
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                            </View>
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Carbs (g)</Text>
                                    <TextInput
                                        value={String(dailyGoals.carbs || "")}
                                        onChangeText={t => setDailyGoals(prev => ({ ...prev, carbs: parseInt(t) || 0 }))}
                                        keyboardType="numeric"
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Fat (g)</Text>
                                    <TextInput
                                        value={String(dailyGoals.fat || "")}
                                        onChangeText={t => setDailyGoals(prev => ({ ...prev, fat: parseInt(t) || 0 }))}
                                        keyboardType="numeric"
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                            </View>
                            <Text style={{ color: themeColors.subText, fontSize: 11, marginTop: 8 }}>Use the plan below to calculate recommended targets automatically</Text>
                        </View>
                        {/* Fitness Goal */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>What is your goal?</Text>
                            <View style={styles.optionGrid}>
                                {FITNESS_GOALS.map(goal => (
                                    <TouchableOpacity
                                        key={goal.id}
                                        style={[
                                            styles.optionCard,
                                            {
                                                backgroundColor: plan.fitnessGoal === goal.id ? themeColors.primary : themeColors.chip,
                                                borderColor: plan.fitnessGoal === goal.id ? themeColors.primary : 'transparent',
                                            }
                                        ]}
                                        onPress={() => setPlan(prev => ({ ...prev, fitnessGoal: goal.id }))}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: plan.fitnessGoal === goal.id ? "#FFF" : themeColors.text }}>
                                            {goal.icon}
                                        </Text>
                                        <Text style={[styles.optionLabel, { color: plan.fitnessGoal === goal.id ? "#FFF" : themeColors.text }]}>
                                            {goal.label}
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: plan.fitnessGoal === goal.id ? "rgba(255,255,255,0.8)" : themeColors.subText }]}>
                                            {goal.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Personal Info */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>About You</Text>

                            {/* Gender */}
                            <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Gender</Text>
                            <View style={styles.chipRow}>
                                {GENDER_OPTIONS.map(g => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[styles.chip, { backgroundColor: plan.gender === g.id ? themeColors.primary : themeColors.chip }]}
                                        onPress={() => setPlan(prev => ({ ...prev, gender: g.id }))}
                                    >
                                        <Text style={{ color: plan.gender === g.id ? "#FFF" : themeColors.text, fontWeight: "500" }}>{g.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Age, Height, Weight */}
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Age</Text>
                                    <TextInput
                                        value={String(plan.age || "")}
                                        onChangeText={t => setPlan(prev => ({ ...prev, age: t }))}
                                        keyboardType="numeric"
                                        placeholder="25"
                                        placeholderTextColor={themeColors.subText}
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Height (cm)</Text>
                                    <TextInput
                                        value={String(plan.height || "")}
                                        onChangeText={t => setPlan(prev => ({ ...prev, height: t }))}
                                        keyboardType="numeric"
                                        placeholder="175"
                                        placeholderTextColor={themeColors.subText}
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Current Weight (kg)</Text>
                                    <TextInput
                                        value={String(plan.weight || "")}
                                        onChangeText={t => setPlan(prev => ({ ...prev, weight: t }))}
                                        keyboardType="numeric"
                                        placeholder="70"
                                        placeholderTextColor={themeColors.subText}
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.subText }]}>Target Weight (kg)</Text>
                                    <TextInput
                                        value={String(plan.targetWeight || "")}
                                        onChangeText={t => setPlan(prev => ({ ...prev, targetWeight: t }))}
                                        keyboardType="numeric"
                                        placeholder="65"
                                        placeholderTextColor={themeColors.subText}
                                        style={[styles.input, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Activity Level */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Activity Level</Text>
                            {ACTIVITY_LEVELS.map(level => (
                                <TouchableOpacity
                                    key={level.id}
                                    style={[
                                        styles.activityOption,
                                        {
                                            backgroundColor: plan.activityLevel === level.id ? themeColors.primary : themeColors.chip,
                                        }
                                    ]}
                                    onPress={() => setPlan(prev => ({ ...prev, activityLevel: level.id }))}
                                >
                                    <Text style={[styles.activityLabel, { color: plan.activityLevel === level.id ? "#FFF" : themeColors.text }]}>
                                        {level.label}
                                    </Text>
                                    <Text style={{ color: plan.activityLevel === level.id ? "rgba(255,255,255,0.8)" : themeColors.subText, fontSize: 12 }}>
                                        {level.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Timeline */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Timeline</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {TIMELINE_OPTIONS.map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[styles.chip, { backgroundColor: plan.timeline === t.id ? themeColors.primary : themeColors.chip, marginRight: 8 }]}
                                        onPress={() => setPlan(prev => ({ ...prev, timeline: t.id }))}
                                    >
                                        <Text style={{ color: plan.timeline === t.id ? "#FFF" : themeColors.text, fontWeight: "500" }}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Calculated Targets */}
                        {targets && (
                            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Your Recommended Targets</Text>
                                <Text style={{ color: themeColors.subText, fontSize: 13, marginBottom: 16 }}>{targets.explanation}</Text>

                                <View style={styles.targetGrid}>
                                    <View style={[styles.targetItem, { backgroundColor: themeColors.chip }]}>
                                        <Text style={[styles.targetValue, { color: themeColors.primary }]}>{targets.targetCalories}</Text>
                                        <Text style={[styles.targetLabel, { color: themeColors.subText }]}>Calories/day</Text>
                                    </View>
                                    <View style={[styles.targetItem, { backgroundColor: themeColors.chip }]}>
                                        <Text style={[styles.targetValue, { color: "#8B5CF6" }]}>{targets.targetProtein}g</Text>
                                        <Text style={[styles.targetLabel, { color: themeColors.subText }]}>Protein</Text>
                                    </View>
                                    <View style={[styles.targetItem, { backgroundColor: themeColors.chip }]}>
                                        <Text style={[styles.targetValue, { color: "#F59E0B" }]}>{targets.targetCarbs}g</Text>
                                        <Text style={[styles.targetLabel, { color: themeColors.subText }]}>Carbs</Text>
                                    </View>
                                    <View style={[styles.targetItem, { backgroundColor: themeColors.chip }]}>
                                        <Text style={[styles.targetValue, { color: "#EF4444" }]}>{targets.targetFat}g</Text>
                                        <Text style={[styles.targetLabel, { color: themeColors.subText }]}>Fat</Text>
                                    </View>
                                </View>

                                <View style={[styles.infoRow, { backgroundColor: themeColors.chip }]}>
                                    <Text style={{ color: themeColors.subText, fontSize: 12 }}>
                                        BMR: {targets.bmr} cal | TDEE: {targets.tdee} cal
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.applyButton, { backgroundColor: themeColors.primary }]}
                                    onPress={handleApplyTargets}
                                >
                                    <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 15 }}>Apply to My Daily Goals</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                            onPress={handleSavePlan}
                            disabled={saving}
                        >
                            <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 16 }}>
                                {saving ? "Saving..." : "Save Plan"}
                            </Text>
                        </TouchableOpacity>
                    </>) : (
                    <>
                        {/* Weight Log Tab */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <View style={styles.weightHeader}>
                                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Weight History</Text>
                                <TouchableOpacity
                                    style={[styles.addWeightBtn, { backgroundColor: themeColors.primary }]}
                                    onPress={() => setShowWeightInput(true)}
                                >
                                    <Text style={{ color: "#FFF", fontWeight: "600" }}>+ Log Weight</Text>
                                </TouchableOpacity>
                            </View>

                            {showWeightInput && (
                                <View style={[styles.weightInputRow, { backgroundColor: themeColors.chip }]}>
                                    <TextInput
                                        value={newWeight}
                                        onChangeText={setNewWeight}
                                        keyboardType="numeric"
                                        placeholder="Weight in kg"
                                        placeholderTextColor={themeColors.subText}
                                        style={[styles.weightInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.weightSaveBtn, { backgroundColor: themeColors.primary }]}
                                        onPress={handleAddWeight}
                                    >
                                        <Text style={{ color: "#FFF", fontWeight: "600" }}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.weightCancelBtn, { backgroundColor: themeColors.chip }]}
                                        onPress={() => { setShowWeightInput(false); setNewWeight(""); }}
                                    >
                                        <Text style={{ color: themeColors.text }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Weight Chart */}
                            {weightChartData ? (
                                <View style={{ marginTop: 16 }}>
                                    <LineChart
                                        data={weightChartData}
                                        width={CHART_WIDTH}
                                        height={200}
                                        chartConfig={chartConfig}
                                        bezier
                                        style={{ borderRadius: 12, marginHorizontal: -8 }}
                                        withInnerLines={true}
                                        withOuterLines={false}
                                        withShadow={false}
                                    />
                                </View>
                            ) : (
                                <View style={styles.emptyWeightState}>
                                    <Text style={{ color: themeColors.subText, textAlign: 'center', marginTop: 24 }}>
                                        Log at least 2 weight entries to see your progress chart.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Weight Entries List */}
                        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Recent Entries</Text>
                            {weightEntries.length === 0 ? (
                                <Text style={{ color: themeColors.subText, fontSize: 13, marginTop: 8 }}>
                                    No weight entries yet. Tap "Log Weight" to start tracking.
                                </Text>
                            ) : (
                                weightEntries.slice(0, 20).map((entry, index) => {
                                    const prevEntry = weightEntries[index + 1];
                                    const diff = prevEntry ? (entry.weight - prevEntry.weight).toFixed(1) : null;
                                    return (
                                        <View key={entry.id} style={[styles.weightEntry, { borderBottomColor: themeColors.chip }]}>
                                            <View>
                                                <Text style={[styles.weightValue, { color: themeColors.text }]}>
                                                    {entry.weight} {entry.unit || 'kg'}
                                                </Text>
                                                <Text style={{ color: themeColors.subText, fontSize: 12 }}>
                                                    {entry.date ? format(parseISO(entry.date), "MMM d, yyyy") : 'N/A'}
                                                </Text>
                                            </View>
                                            {diff !== null && (
                                                <Text style={{
                                                    color: parseFloat(diff) > 0 ? "#EF4444" : parseFloat(diff) < 0 ? "#10B981" : themeColors.subText,
                                                    fontWeight: "600", fontSize: 13,
                                                }}>
                                                    {parseFloat(diff) > 0 ? "+" : ""}{diff} {entry.unit || 'kg'}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>

                        {/* Summary */}
                        {weightEntries.length >= 2 && (
                            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Summary</Text>
                                {(() => {
                                    const sorted = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
                                    const first = sorted[0];
                                    const last = sorted[sorted.length - 1];
                                    const totalChange = (last.weight - first.weight).toFixed(1);
                                    const isLoss = parseFloat(totalChange) < 0;
                                    return (
                                        <View style={styles.summaryGrid}>
                                            <View style={[styles.summaryItem, { backgroundColor: themeColors.chip }]}>
                                                <Text style={[styles.summaryValue, { color: themeColors.text }]}>{first.weight} kg</Text>
                                                <Text style={{ color: themeColors.subText, fontSize: 11 }}>Starting</Text>
                                            </View>
                                            <View style={[styles.summaryItem, { backgroundColor: themeColors.chip }]}>
                                                <Text style={[styles.summaryValue, { color: themeColors.text }]}>{last.weight} kg</Text>
                                                <Text style={{ color: themeColors.subText, fontSize: 11 }}>Current</Text>
                                            </View>
                                            <View style={[styles.summaryItem, { backgroundColor: themeColors.chip }]}>
                                                <Text style={[styles.summaryValue, { color: isLoss ? "#10B981" : "#EF4444" }]}>
                                                    {parseFloat(totalChange) > 0 ? "+" : ""}{totalChange} kg
                                                </Text>
                                                <Text style={{ color: themeColors.subText, fontSize: 11 }}>Change</Text>
                                            </View>
                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    backButton: { padding: 4 },
    backText: { fontSize: 16, fontWeight: "600" },
    headerTitle: { fontSize: 22, fontWeight: "bold" },
    tabContainer: { flexDirection: "row", gap: 12, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
    card: { borderRadius: 16, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
    optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    optionCard: { width: "47%", padding: 14, borderRadius: 12, borderWidth: 1 },
    optionLabel: { fontWeight: "600", fontSize: 14, marginTop: 6 },
    optionDesc: { fontSize: 11, marginTop: 2 },
    fieldLabel: { fontSize: 12, marginBottom: 4, marginTop: 12 },
    chipRow: { flexDirection: "row", gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    inputRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    inputGroup: { flex: 1 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, height: 40 },
    activityOption: { padding: 14, borderRadius: 12, marginBottom: 8 },
    activityLabel: { fontWeight: "600", fontSize: 14 },
    targetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    targetItem: { width: "47%", padding: 14, borderRadius: 12, alignItems: "center" },
    targetValue: { fontSize: 22, fontWeight: "bold" },
    targetLabel: { fontSize: 12, marginTop: 4 },
    infoRow: { padding: 10, borderRadius: 8, marginTop: 12 },
    applyButton: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
    saveButton: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
    weightHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    addWeightBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    weightInputRow: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, marginTop: 12, alignItems: "center" },
    weightInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, fontSize: 14 },
    weightSaveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    weightCancelBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
    emptyWeightState: { paddingVertical: 32 },
    weightEntry: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
    weightValue: { fontSize: 16, fontWeight: "600" },
    summaryGrid: { flexDirection: "row", gap: 10 },
    summaryItem: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
    summaryValue: { fontSize: 16, fontWeight: "bold" },
});
