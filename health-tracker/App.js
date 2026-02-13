// ============================================================================
// NUTRISNAP - AI-Powered Health & Meal Tracker
// ============================================================================
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View, StyleSheet, ScrollView, Modal, TouchableOpacity, Platform,
  StatusBar, Alert, Image, Dimensions, KeyboardAvoidingView, TextInput, Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Provider as PaperProvider, Text, ActivityIndicator,
  MD3LightTheme, MD3DarkTheme,
} from "react-native-paper";
import {
  Camera, Image as LucideImage, Settings, BarChart2, Target,
  Flame, Dumbbell, Wheat, Droplets, Trophy, Calendar,
  UtensilsCrossed, ChevronRight, Check, X,
  ArrowLeft, Eye, EyeOff, Lock, Mail, User,
  PieChart as PieChartIcon, Activity, Leaf,
  Sunrise, Sun, Moon, Coffee, LayoutGrid, Pizza, IceCream, Utensils,
  TrendingUp, TrendingDown, Minus, Heart,
  ShieldCheck, FileText, HelpCircle, LogOut, Trash2, Lightbulb
} from "lucide-react-native";
import CategoryFilter from "./components/CategoryFilter";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { analyzeFood } from "./lib/gemini";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { format, subDays, startOfDay, isAfter, parseISO, isBefore, isToday } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import { signOut, signUpWithEmail, signInWithEmail, resetPassword, onAuthChange, deleteAccount } from "./authService";
import {
  saveUserPreferences, getUserPreferences, addMeals,
  updateMeal as updateMealInFirestore, deleteMeal as deleteMealFromFirestore,
  subscribeToMeals,
} from "./firestoreService";
import { uploadBase64Image, uploadImageUri, deleteFile } from "./storageService";
import NetInfo from '@react-native-community/netinfo';
import { calculateStreakData, getStreakStatusMessage, hasLoggedToday as checkLoggedToday } from "./services/streakService";
import { calculateHealthScore, getScoreLabel } from "./services/healthScoreService";
import { generateWeeklyInsights } from "./services/insightsService";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
import ReportsScreen from "./screens/ReportsScreen";
import GoalPlanningScreen from "./screens/GoalPlanningScreen";
import PrivacyPolicyScreen from "./screens/PrivacyPolicyScreen";
import TermsScreen from "./screens/TermsScreen";

// ============================================================================
// CONSTANTS
// ============================================================================
// CONSTANTS
// ============================================================================
const MEAL_FILTERS = [
  { value: "All", label: "All", icon: "LayoutGrid", color: "#6366F1" },
  { value: "Breakfast", label: "Breakfast", icon: "Coffee", color: "#F59E0B" },
  { value: "Lunch", label: "Lunch", icon: "Utensils", color: "#10B981" },
  { value: "Dinner", label: "Dinner", icon: "Pizza", color: "#F97316" },
  { value: "Snack", label: "Snack", icon: "IceCream", color: "#EC4899" },
];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const DATE_FILTERS = ["Today", "This Week", "This Month", "All Time"];
const DEFAULT_GOALS = { calories: 2000, protein: 50, carbs: 250, fat: 65 };

const THEMES = {
  "Warm Sunset": { primary: "#F97316", primaryDark: "#F97316", gradient: ["#F97316", "#EC4899", "#1E1B4B"], gradientDark: ["#F97316", "#C2410C"], bgLight: "#FFF7ED", bgDark: "#1C1917", cardDark: "#292524", chipDark: "#44403C" },
  "Rose Pink": { primary: "#EC4899", primaryDark: "#EC4899", gradient: ["#EC4899", "#8B5CF6", "#083344"], gradientDark: ["#EC4899", "#BE185D"], bgLight: "#FDF2F8", bgDark: "#1A0A14", cardDark: "#2D1A24", chipDark: "#4A2639" },
  "Golden Amber": { primary: "#D97706", primaryDark: "#D97706", gradient: ["#F59E0B", "#10B981", "#450A0A"], gradientDark: ["#F59E0B", "#B45309"], bgLight: "#FFFBEB", bgDark: "#1A1408", cardDark: "#2A2010", chipDark: "#4A3820" },
  "Lavender Dream": { primary: "#A78BFA", primaryDark: "#A78BFA", gradient: ["#8B5CF6", "#3B82F6", "#422006"], gradientDark: ["#A78BFA", "#8B5CF6"], bgLight: "#F5F3FF", bgDark: "#1A1625", cardDark: "#2D2540", chipDark: "#3D3555" },
  "Coral Blush": { primary: "#FB7185", primaryDark: "#FB7185", gradient: ["#FB7185", "#0EA5E9", "#1A2E05"], gradientDark: ["#FB7185", "#F43F5E"], bgLight: "#FFF1F2", bgDark: "#1A0F10", cardDark: "#2D1E20", chipDark: "#4A3035" },
  "Teal Mint": { primary: "#14B8A6", primaryDark: "#14B8A6", gradient: ["#14B8A6", "#F59E0B", "#2E1065"], gradientDark: ["#14B8A6", "#0D9488"], bgLight: "#F0FDFA", bgDark: "#0A1A18", cardDark: "#1A2D2A", chipDark: "#264540" },
};
const THEME_NAMES = Object.keys(THEMES);

// ============================================================================
// UTILITY
// ============================================================================
const formatDate = (dateStr) => { try { return format(parseISO(dateStr), "dd MMM"); } catch { return dateStr || 'N/A'; } };
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  } catch { return timeStr; }
};
const getFirestoreErrorMessage = (error) => {
  const msgs = { 'permission-denied': 'Permission denied', 'unavailable': 'No connection', 'unauthenticated': 'Please sign in' };
  return msgs[error?.code] || error?.message || 'Unknown error';
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================
const FilterChip = React.memo(({ label, selected, onPress, primaryColor, chipBg, textColor }) => (
  <TouchableOpacity onPress={onPress} style={[styles.filterChip, { backgroundColor: selected ? primaryColor : chipBg }]}>
    <Text style={{ color: selected ? "#FFF" : textColor, fontWeight: selected ? "bold" : "normal", fontSize: 13 }}>{label}</Text>
  </TouchableOpacity>
));

const ProcessingOverlay = React.memo(({ visible, status, themeColors }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent>
      <View style={styles.processingOverlay}>
        <View style={[styles.processingCard, { backgroundColor: themeColors.card }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.processingText, { color: themeColors.text }]}>{status || "Analyzing food..."}</Text>
        </View>
      </View>
    </Modal>
  );
});

// Health Score Card
const HealthScoreCard = React.memo(({ score, label, themeColors, onPress }) => (
  <TouchableOpacity style={[styles.scoreCard, { backgroundColor: themeColors.card }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.scoreCircle, { borderColor: label.color, width: 40, height: 40, borderRadius: 20 }]}>
      <Text style={[styles.scoreNumber, { color: label.color, fontSize: 14 }]}>{score}</Text>
    </View>
    <View style={{ marginLeft: 10, flex: 1 }}>
      <Text style={{ color: themeColors.text, fontSize: 13, fontWeight: '600' }}>Daily Score</Text>
      <Text style={{ color: label.color, fontSize: 11 }}>{label.label}</Text>
    </View>
  </TouchableOpacity>
));

// Streak Card
const StreakCard = React.memo(({ currentStreak, bestStreak, themeColors, onPress }) => (
  <TouchableOpacity style={[styles.streakCard, { backgroundColor: themeColors.card }]} onPress={onPress} activeOpacity={0.7}>
    <Flame size={24} color="#F59E0B" />
    <View style={{ marginLeft: 8, flex: 1 }}>
      <Text style={{ color: themeColors.text, fontSize: 13, fontWeight: '600' }}>{currentStreak} Day Streak</Text>
      <Text style={{ color: themeColors.subText, fontSize: 11 }}>Best: {bestStreak}</Text>
    </View>
  </TouchableOpacity>
));

// Gradient Text Component
const GradientText = ({ text, fontSize = 24, style, colors = ["#F97316", "#EA580C"], center = false }) => {
  const width = fontSize * 7;
  return (
    <View style={style}>
      <Svg height={fontSize * 1.4} width={width} viewBox={`0 0 ${width} ${fontSize * 1.4}`}>
        <Defs>
          <SvgGradient id={`textGrad-${text}`} x1="0" y1="0" x2="1" y2="0">
            {colors.map((color, index) => (
              <Stop
                key={index}
                offset={index / (colors.length - 1)}
                stopColor={color}
              />
            ))}
          </SvgGradient>
        </Defs>
        <SvgText
          fill={`url(#textGrad-${text})`}
          fontSize={fontSize}
          fontWeight="bold"
          x={center ? width / 2 : 0}
          y={fontSize}
          textAnchor={center ? "middle" : "start"}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
};

// Today's Nutrition Detail Modal
const NutritionDetailModal = React.memo(({ visible, onClose, totals, goals, themeColors }) => {
  if (!visible) return null;
  const items = [
    { label: "Calories", icon: Flame, value: totals.calories, goal: goals.calories, unit: "cal", color: "#EF4444" },
    { label: "Protein", icon: Dumbbell, value: totals.protein, goal: goals.protein, unit: "g", color: "#8B5CF6" },
    { label: "Carbs", icon: Wheat, value: totals.carbs, goal: goals.carbs, unit: "g", color: "#F59E0B" },
    { label: "Fat", icon: Droplets, value: totals.fat, goal: goals.fat, unit: "g", color: "#EC4899" },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.detailModalContent, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>Today's Nutrition</Text>
          {items.map((item) => {
            const percent = item.goal > 0 ? Math.min((item.value / item.goal) * 100, 100) : 0;
            const status = percent >= 90 && percent <= 110 ? "On target" : percent < 90 ? `${Math.round(item.goal - item.value)} ${item.unit} left` : "Over target";
            return (
              <View key={item.label} style={[styles.nutritionDetailRow, { backgroundColor: themeColors.chip }]}>
                <item.icon size={24} color={item.color} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 14 }}>{item.label}</Text>
                    <Text style={{ color: themeColors.text, fontSize: 14 }}>{Math.round(item.value)} / {item.goal} {item.unit}</Text>
                  </View>
                  <View style={[styles.nutritionProgressBg, { backgroundColor: themeColors.card }]}>
                    <View style={[styles.nutritionProgressFill, { width: `${percent}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={{ color: themeColors.subText, fontSize: 11, marginTop: 4 }}>{Math.round(percent)}% · {status}</Text>
                </View>
              </View>
            );
          })}
          <TouchableOpacity style={[styles.modalCloseBtn, { overflow: 'hidden' }]} onPress={onClose}>
            <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

// Score Detail Modal
const ScoreDetailModal = React.memo(({ visible, onClose, scoreData, themeColors }) => {
  if (!visible) return null;
  const { score, breakdown, label } = scoreData;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.detailModalContent, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>Score Breakdown</Text>
          <View style={[styles.scoreCircle, { borderColor: label.color, width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginVertical: 16 }]}>
            <Text style={[styles.scoreNumber, { color: label.color, fontSize: 28 }]}>{score}</Text>
          </View>
          <Text style={{ color: label.color, textAlign: 'center', fontSize: 16, marginBottom: 16, fontWeight: '600' }}>{label.label}</Text>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <Flame size={20} color="#EF4444" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeColors.text, fontWeight: '600' }}>Calorie Goal</Text>
              <Text style={{ color: themeColors.subText, fontSize: 11 }}>Stay close to your target</Text>
            </View>
            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{breakdown?.calories || 0}/40</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <Dumbbell size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeColors.text, fontWeight: '600' }}>Protein Goal</Text>
              <Text style={{ color: themeColors.subText, fontSize: 11 }}>Meet your protein intake</Text>
            </View>
            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{breakdown?.protein || 0}/35</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <Activity size={20} color="#10B981" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeColors.text, fontWeight: '600' }}>Consistency</Text>
              <Text style={{ color: themeColors.subText, fontSize: 11 }}>Meals logged + streak</Text>
            </View>
            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{breakdown?.consistency || 0}/25</Text>
          </View>
          <TouchableOpacity style={[styles.modalCloseBtn, { overflow: 'hidden' }]} onPress={onClose}>
            <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

// Streak Detail Modal
const StreakDetailModal = React.memo(({ visible, onClose, streakData, themeColors }) => {
  if (!visible) return null;
  const { currentStreak, bestStreak, badges } = streakData;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.detailModalContent, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>🔥 Streak Details</Text>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Flame size={48} color="#F59E0B" />
            <Text style={{ color: themeColors.text, fontSize: 28, fontWeight: 'bold' }}>{currentStreak} Days</Text>
            <Text style={{ color: themeColors.subText }}>Best: {bestStreak} days</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <Check size={20} color="#10B981" style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, color: themeColors.text, fontSize: 13 }}>Log 1+ meal = streak continues</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <Coffee size={20} color="#F59E0B" style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, color: themeColors.text, fontSize: 13 }}>Miss 1 day = paused (can resume)</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: themeColors.chip }]}>
            <X size={20} color="#EF4444" style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, color: themeColors.text, fontSize: 13 }}>Miss 2 days = resets to 0</Text>
          </View>
          {badges.length > 0 && (
            <>
              <Text style={{ color: themeColors.text, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>🏅 Badges Earned</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {badges.map((b, i) => (
                  <View key={i} style={[styles.badge, { backgroundColor: themeColors.chip }]}>
                    <Trophy size={14} color={themeColors.primary} style={{ marginRight: 4 }} />
                    <Text style={{ color: themeColors.text }}>{b.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <TouchableOpacity style={[styles.modalCloseBtn, { overflow: 'hidden' }]} onPress={onClose}>
            <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

// How To Use Modal
const HowToUseModal = React.memo(({ visible, onClose, themeColors }) => {
  if (!visible) return null;
  const steps = [
    { icon: Camera, title: "Snap a Photo", text: "Use camera or gallery to capture your food.", color: "#3B82F6" },
    { icon: Activity, title: "AI Analyzes", text: "Calories, protein, carbs, and fat are detected automatically.", color: "#8B5CF6" },
    { icon: BarChart2, title: "Track Progress", text: "Tap the progress bar for a detailed nutrition breakdown.", color: "#10B981" },
    { icon: TrendingUp, title: "View Reports", text: "Check trends, charts, and personalized suggestions.", color: "#F59E0B" },
    { icon: Target, title: "Set Goals", text: "Use Goal Planning for personalized calorie targets.", color: "#EF4444" },
    { icon: Utensils, title: "Edit Meals", text: "Long-press any meal card to edit or delete it.", color: "#EC4899" },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModalContent, { backgroundColor: themeColors.card, maxHeight: '80%' }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>📖 How to Use</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {steps.map((s, i) => (
              <View key={i} style={[styles.howToStep, { backgroundColor: themeColors.chip }]}>
                <s.icon size={24} color={s.color} style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 14 }}>{s.title}</Text>
                  <Text style={{ color: themeColors.subText, fontSize: 13 }}>{s.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.modalCloseBtn, { overflow: 'hidden' }]} onPress={onClose}>
            <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// ============================================================================
// EDIT MODAL
// ============================================================================
const EditModal = React.memo(({ visible, editItem, setEditItem, onClose, onSave, onDelete, themeColors, isDarkMode }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  if (!visible || !editItem) return null;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Meal</Text>
            {editItem?.photoUrl && (
              <TouchableOpacity style={[styles.viewPhotoBtn, { backgroundColor: themeColors.chip }]} onPress={() => setShowFullImage(true)}>
                <Text style={{ color: themeColors.text, fontWeight: "600" }}>View Photo</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Food Name</Text>
            <TextInput value={editItem?.food_name || ""} onChangeText={(t) => setEditItem(prev => ({ ...prev, food_name: t }))}
              style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Calories</Text>
                <TextInput value={String(editItem?.calories ?? "")} keyboardType="numeric"
                  onChangeText={(t) => setEditItem(prev => ({ ...prev, calories: parseFloat(t) || 0 }))}
                  style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Protein (g)</Text>
                <TextInput value={String(editItem?.protein ?? "")} keyboardType="numeric"
                  onChangeText={(t) => setEditItem(prev => ({ ...prev, protein: parseFloat(t) || 0 }))}
                  style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Carbs (g)</Text>
                <TextInput value={String(editItem?.carbs ?? "")} keyboardType="numeric"
                  onChangeText={(t) => setEditItem(prev => ({ ...prev, carbs: parseFloat(t) || 0 }))}
                  style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Fat (g)</Text>
                <TextInput value={String(editItem?.fat ?? "")} keyboardType="numeric"
                  onChangeText={(t) => setEditItem(prev => ({ ...prev, fat: parseFloat(t) || 0 }))}
                  style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
              </View>
            </View>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Meal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {MEAL_TYPES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setEditItem(prev => ({ ...prev, meal_type: c }))}
                  style={[styles.catChip, { backgroundColor: editItem?.meal_type === c ? themeColors.primary : themeColors.chip }]}>
                  <Text style={{ color: editItem?.meal_type === c ? "#FFF" : themeColors.text, fontSize: 12 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.chip }]} onPress={onClose}>
                <Text style={{ color: themeColors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { overflow: 'hidden' }]} onPress={onSave}>
                <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>Save</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Delete Meal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <Modal visible={showFullImage} transparent animationType="fade">
        <TouchableOpacity style={styles.fullImageOverlay} activeOpacity={1} onPress={() => setShowFullImage(false)}>
          <View style={styles.fullImageContainer}>
            {editItem?.photoUrl && <Image source={{ uri: editItem.photoUrl }} style={styles.fullImage} resizeMode="contain" />}
            <TouchableOpacity style={styles.closeImageBtn} onPress={() => setShowFullImage(false)}>
              <X size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "bold" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
});

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  // State - always dark mode
  const [themeMode, setThemeMode] = useState("Dark");
  const [themeColor, setThemeColor] = useState("Warm Sunset");
  const [screen, setScreen] = useState("home");
  const [meals, setMeals] = useState([]);
  const [dailyGoals, setDailyGoals] = useState(DEFAULT_GOALS);
  const [dateFilter, setDateFilter] = useState("Today");
  const [mealTypeFilter, setMealTypeFilter] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [saveFoodPhotos, setSaveFoodPhotos] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const isInitialLoad = useRef(true);
  const preferencesLoaded = useRef(false);
  const savePrefsTimeoutRef = useRef(null);
  const lastSavedPrefs = useRef(null);

  // Memoized
  const isDarkMode = true;
  const currentTheme = useMemo(() => THEMES[themeColor], [themeColor]);
  const themeColors = useMemo(() => ({
    primary: isDarkMode ? currentTheme.primaryDark : currentTheme.primary,
    gradient: isDarkMode ? currentTheme.gradientDark : currentTheme.gradient,
    bg: isDarkMode ? currentTheme.bgDark : currentTheme.bgLight,
    card: isDarkMode ? currentTheme.cardDark : "#FFFFFF",
    chip: isDarkMode ? currentTheme.chipDark : "#E5E7EB",
    text: isDarkMode ? "#FFFFFF" : "#1F2937",
    subText: isDarkMode ? "#9CA3AF" : "#6B7280",
  }), [isDarkMode, currentTheme]);
  const theme = useMemo(() => isDarkMode
    ? { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, primary: currentTheme.primaryDark, background: currentTheme.bgDark, surface: currentTheme.cardDark } }
    : { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, primary: currentTheme.primary, background: currentTheme.bgLight, surface: "#FFFFFF" } }, [isDarkMode, currentTheme]);

  // Derived Values
  const getMealIconName = (type) => {
    switch (type) {
      case "Breakfast": return "Coffee";
      case "Lunch": return "Utensils";
      case "Dinner": return "Pizza";
      case "Snack": return "IceCream";
      default: return "Utensils";
    }
  };

  // Filtered meals
  const filteredMeals = useMemo(() => {
    let result = [...meals];
    const today = new Date();
    if (dateFilter === "Today") result = result.filter((m) => { try { return isToday(parseISO(m?.date)); } catch { return false; } });
    else if (dateFilter === "This Week") { const weekAgo = subDays(today, 7); result = result.filter((m) => { try { return isAfter(parseISO(m?.date), weekAgo); } catch { return false; } }); }
    else if (dateFilter === "This Month") { const monthAgo = subDays(today, 30); result = result.filter((m) => { try { return isAfter(parseISO(m?.date), monthAgo); } catch { return false; } }); }
    if (mealTypeFilter !== "All") result = result.filter((m) => m?.meal_type === mealTypeFilter);
    return result.sort((a, b) => new Date(b?.date + ' ' + (b?.time || '')) - new Date(a?.date + ' ' + (a?.time || '')));
  }, [meals, dateFilter, mealTypeFilter]);

  const todaysMeals = useMemo(() => meals.filter(m => { try { return isToday(parseISO(m?.date)); } catch { return false; } }), [meals]);
  const todaysTotals = useMemo(() => ({
    calories: todaysMeals.reduce((s, m) => s + (m?.calories || 0), 0),
    protein: todaysMeals.reduce((s, m) => s + (m?.protein || 0), 0),
    carbs: todaysMeals.reduce((s, m) => s + (m?.carbs || 0), 0),
    fat: todaysMeals.reduce((s, m) => s + (m?.fat || 0), 0),
  }), [todaysMeals]);
  const streakData = useMemo(() => calculateStreakData(meals), [meals]);
  const healthScoreData = useMemo(() => calculateHealthScore({ todaysMeals, dailyGoals, currentStreak: streakData.currentStreak }), [todaysMeals, dailyGoals, streakData.currentStreak]);
  const weeklyInsights = useMemo(() => generateWeeklyInsights(meals, dailyGoals), [meals, dailyGoals]);

  // Effects
  useEffect(() => { const unsub = onAuthChange((u) => { setUser(u); setAuthLoading(false); }); return () => unsub(); }, []);
  useEffect(() => {
    if (user) { if (!preferencesLoaded.current) loadUserData(); setScreen("home"); }
    else { preferencesLoaded.current = false; isInitialLoad.current = true; lastSavedPrefs.current = null; setMeals([]); setDailyGoals(DEFAULT_GOALS); if (!authLoading) setScreen("login"); }
  }, [user, authLoading]);
  useEffect(() => { if (!user) return; const unsub = subscribeToMeals((m) => setMeals(m)); return () => unsub(); }, [user]);
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    if (savePrefsTimeoutRef.current) clearTimeout(savePrefsTimeoutRef.current);
    savePrefsTimeoutRef.current = setTimeout(savePrefs, 1000);
    return () => { if (savePrefsTimeoutRef.current) clearTimeout(savePrefsTimeoutRef.current); };
  }, [themeColor, dailyGoals, saveFoodPhotos]);
  useEffect(() => { if (!user) return; }, [user]);

  function savePrefs() {
    if (!user || isInitialLoad.current) return;
    const cur = JSON.stringify({ themeColor, dailyGoals, saveFoodPhotos });
    if (cur === lastSavedPrefs.current) return;
    lastSavedPrefs.current = cur;
    saveUserPreferences({ themeColor, dailyGoals, saveFoodPhotos });
  }

  async function loadUserData() {
    setIsSyncing(true);
    try {
      const prefsResult = await getUserPreferences();
      if (prefsResult.success && prefsResult.preferences) {
        const p = prefsResult.preferences;
        if (p.themeColor && THEMES[p.themeColor]) setThemeColor(p.themeColor);
        if (p.dailyGoals) setDailyGoals(p.dailyGoals);
        if (p.saveFoodPhotos !== undefined) setSaveFoodPhotos(p.saveFoodPhotos);
        if (p.saveFoodPhotos !== undefined) setSaveFoodPhotos(p.saveFoodPhotos);

        lastSavedPrefs.current = JSON.stringify({ themeColor: p.themeColor || "Warm Sunset", dailyGoals: p.dailyGoals || DEFAULT_GOALS, saveFoodPhotos: p.saveFoodPhotos !== undefined ? p.saveFoodPhotos : true });
      }
      preferencesLoaded.current = true; isInitialLoad.current = false;
    } catch (error) { Alert.alert("Error", getFirestoreErrorMessage(error)); preferencesLoaded.current = true; isInitialLoad.current = false; }
    finally { setIsSyncing(false); }
  }

  function showDialog(title, message, buttons = [{ text: "OK" }]) {
    Alert.alert(title, message, buttons.map(btn => ({ text: btn.text, style: btn.style === "destructive" ? "destructive" : "default", onPress: btn.onPress })));
  }
  function getAutoMealType() { const h = new Date().getHours(); if (h >= 5 && h < 11) return "Breakfast"; if (h >= 11 && h < 15) return "Lunch"; if (h >= 15 && h < 18) return "Snack"; return "Dinner"; }


  async function handleCameraCapture() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { showDialog("Permission Needed", "Camera access is required."); return; }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: true // Still need base64 for Gemini AI
      });
      if (result.canceled || !result.assets?.length) return;
      processFood(result.assets[0], getAutoMealType());
    } catch (err) { showDialog("Error", "Could not access camera."); }
  }

  async function handleGalleryPick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true // Still need base64 for Gemini AI
      });
      if (result.canceled || !result.assets?.length) return;
      processFood(result.assets[0], getAutoMealType());
    } catch (err) { showDialog("Error", "Could not access gallery."); }
  }

  async function processFood(image, mealType) {
    if (!image) return;

    // 4. Offline Handling
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      showDialog("No Internet", "An internet connection is required to analyze food.");
      return;
      return;
    }

    // Capture time immediately when processing starts (upload time)
    const now = new Date();

    setIsProcessing(true); setProcessingStatus("Analyzing your food...");
    try {
      const data = await analyzeFood({ base64: image.base64 });

      let photoUrl = null;
      let storagePath = null;

      if (saveFoodPhotos && user) {
        setProcessingStatus("Uploading photo...");
        try {
          // 2. Use URI for upload (Better Performance)
          // We use the URI from the image asset
          const r = await uploadImageUri(image.uri, `meal_${Date.now()}.jpg`);
          if (r.success) {
            photoUrl = r.downloadURL;
            storagePath = r.fullPath; // 1. Save storage path for deletion
          }
        } catch (e) {
          console.log("Upload failed", e);
        }
      }

      setProcessingStatus("Saving details...");
      await addMeals([{
        id: `${Date.now()}_${Math.random()}`,
        food_name: data.food_name,
        meal_type: mealType,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        serving_size: data.serving_size,
        confidence: data.confidence,
        serving_size: data.serving_size,
        confidence: data.confidence,
        date: now.toISOString().slice(0, 10),
        time: now.toISOString().slice(11, 16),
        photoUrl,
        storagePath // storing this for future deletion
      }]);

      setIsProcessing(false); setProcessingStatus("");
      showDialog("✅ Logged", `${data.food_name} · ${data.calories} cal`);
    } catch (err) {
      setIsProcessing(false);
      setProcessingStatus("");
      showDialog("Error", "Something went wrong. Please try again.");
    }
  }

  const openEdit = useCallback((item) => { setEditItem({ ...item }); setEditModal(true); }, []);
  const saveEdit = useCallback(async () => {
    if (!editItem) return; const s = { ...editItem }; setEditModal(false); setEditItem(null);
    try { const { id, createdAt, updatedAt, ...updates } = s; await updateMealInFirestore(id, updates); } catch (e) { showDialog("Error", getFirestoreErrorMessage(e)); }
  }, [editItem]);
  const deleteMeal = useCallback(() => {
    if (!editItem) return; const d = { ...editItem }; setEditModal(false); setEditItem(null);
    showDialog("Delete Meal?", "Are you sure?", [{ text: "Cancel", style: "cancel" }, {
      text: "Delete", style: "destructive", onPress: async () => {
        // Fix 1: Orphaned Images - Delete using storagePath if available
        if (d.storagePath) {
          await deleteFile(d.storagePath);
        } else if (d.photoUrl) {
          // Fallback: If we don't have storagePath (legacy data), we can't reliably delete 
          // without parsing the URL which is risky. We'll leave it for now.
          // In a production app, you might want to try parsing it.
          console.log("Skipping image delete: No storagePath available for legacy item.");
        }
        await deleteMealFromFirestore(d.id);
      }
    }]);
  }, [editItem]);



  async function handleDeleteAccount() {
    showDialog("Delete Account?", "This will permanently delete your account and all data. This cannot be undone.", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const result = await deleteAccount();
          if (result.success) {
            showDialog("Account Deleted", "Your account has been permanently deleted.");
          } else {
            showDialog("Error", result.error);
          }
        }
      }
    ]);
  }

  function handleUpdateGoals(g) { setDailyGoals(g); }

  // ========== HOME SCREEN ==========
  const HomeScreen = () => {
    const getMacroColor = (v, g, t) => { const r = v / g; if (t === 'calories') { if (r < 0.7) return '#10B981'; if (r <= 1.0) return '#F59E0B'; return '#EF4444'; } if (r < 0.5) return '#EF4444'; if (r <= 1.0) return '#10B981'; return '#F59E0B'; };
    const getHeroMsg = () => { const c = todaysTotals.calories; const g = dailyGoals.calories; const n = todaysMeals.length; const p = Math.round((c / g) * 100); if (n === 0) return ""; if (p < 50) return `${p}% of goal · ${n} meal${n > 1 ? 's' : ''}`; if (p < 90) return `${p}% · On track`; if (p <= 105) return `Goal reached · ${n} meals`; return `${p}% · Over goal`; };

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={[styles.header, { marginBottom: 12 }]}>
            <GradientText text="NutriSnap" fontSize={26} colors={themeColors.gradient} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setScreen("goalPlanning")} hitSlop={8}>
                <Target size={26} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScreen("reports")} hitSlop={8}>
                <BarChart2 size={26} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScreen("settings")} hitSlop={8}>
                <Settings size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>



          {/* Today's Progress - tappable */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowNutritionModal(true)}>
            <LinearGradient colors={themeColors.gradient} style={styles.heroCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Today's Progress</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold' }}>{Math.round(todaysTotals.calories)}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}> / {dailyGoals.calories} cal</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>{getHeroMsg()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' }}>Pro {Math.round(todaysTotals.protein)}g</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' }}>Carb {Math.round(todaysTotals.carbs)}g</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' }}>Fat {Math.round(todaysTotals.fat)}g</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <View style={[styles.progressTrack, { flex: 1, marginTop: 0 }]}>
                  <View style={[styles.progressFill, { width: `${Math.min((todaysTotals.calories / dailyGoals.calories) * 100, 100)}%` }]} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', minWidth: 36, textAlign: 'right' }}>{Math.min(Math.round((todaysTotals.calories / dailyGoals.calories) * 100), 999)}%</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Score & Streak */}
          <View style={styles.scoreStreakRow}>
            <HealthScoreCard score={healthScoreData.score} label={healthScoreData.label} themeColors={themeColors} onPress={() => setShowScoreModal(true)} />
            <StreakCard currentStreak={streakData.currentStreak} bestStreak={streakData.bestStreak} themeColors={themeColors} onPress={() => setShowStreakModal(true)} />
          </View>


          {showInsights && weeklyInsights.length > 0 && (
            <View style={[styles.insightsContainer, { backgroundColor: themeColors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Lightbulb size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionLabel, { color: themeColors.text, marginLeft: 0, marginTop: 0, marginBottom: 0 }]}>Insights</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInsights(false)} hitSlop={8}>
                  <X size={20} color={themeColors.subText} />
                </TouchableOpacity>
              </View>
              {weeklyInsights.map((insight, i) => (
                <View key={i} style={[styles.insightRow, { backgroundColor: themeColors.chip }]}>
                  <Text style={[styles.insightText, { color: themeColors.text }]}>{insight.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 16 }]}>
            {DATE_FILTERS.map(f => <FilterChip key={f} label={f} selected={dateFilter === f} onPress={() => setDateFilter(f)} primaryColor={themeColors.primary} chipBg={themeColors.chip} textColor={themeColors.text} />)}
          </ScrollView>
          <CategoryFilter
            activeCategory={mealTypeFilter}
            onCategoryPress={setMealTypeFilter}
            categories={MEAL_FILTERS}
            themeColors={themeColors}
          />

          {/* Meals */}
          {filteredMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <UtensilsCrossed size={64} color={themeColors.chip} />
              <Text style={{ color: themeColors.subText, marginTop: 12, textAlign: 'center', fontSize: 14 }}>No meals yet</Text>
              <Text style={{ color: themeColors.subText, marginTop: 4, textAlign: 'center', fontSize: 13 }}>Snap a photo to get started</Text>
            </View>
          ) : (
            (() => {
              // Group meals by date
              const mealsByDate = {};
              filteredMeals.forEach(item => {
                const dateKey = item?.date || 'Unknown';
                if (!mealsByDate[dateKey]) mealsByDate[dateKey] = [];
                mealsByDate[dateKey].push(item);
              });

              return Object.entries(mealsByDate).map(([dateKey, dateMeals]) => (
                <View key={dateKey}>
                  {/* Date Header */}
                  <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
                    <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '600' }}>
                      {dateKey !== 'Unknown' ? format(parseISO(dateKey), 'EEEE, MMM d, yyyy') : 'Unknown Date'}
                    </Text>
                  </View>
                  {dateMeals.map(item => {
                    const expanded = expandedMealId === item.id;
                    return (
                      <TouchableOpacity key={item.id} onPress={() => setExpandedMealId(prev => prev === item.id ? null : item.id)} onLongPress={() => openEdit(item)}>
                        <View style={[styles.mealCard, { backgroundColor: themeColors.card }]}>
                          {item?.photoUrl && <Image source={{ uri: item.photoUrl, cache: 'force-cache' }} style={styles.mealThumb} />}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.mealName, { color: themeColors.text, flex: 1 }]} numberOfLines={1}>{item?.food_name}</Text>
                              <Text style={{ color: getMacroColor(item?.calories || 0, dailyGoals.calories / 3, 'calories'), fontWeight: 'bold', fontSize: 14 }}>{item?.calories} cal</Text>
                            </View>
                            <Text style={{ color: themeColors.subText, fontSize: 11, marginTop: 2 }}>{item?.meal_type} · {formatTime(item?.time)}</Text>
                            {expanded && (
                              <View style={styles.expandedMacros}>
                                <View style={styles.macroItem}><Text style={{ color: themeColors.subText, fontSize: 11 }}>Pro</Text><Text style={{ color: getMacroColor(item?.protein || 0, dailyGoals.protein / 3, 'protein'), fontWeight: '600', fontSize: 13 }}>{item?.protein}g</Text></View>
                                <View style={styles.macroItem}><Text style={{ color: themeColors.subText, fontSize: 11 }}>Carb</Text><Text style={{ color: getMacroColor(item?.carbs || 0, dailyGoals.carbs / 3, 'carbs'), fontWeight: '600', fontSize: 13 }}>{item?.carbs}g</Text></View>
                                <View style={styles.macroItem}><Text style={{ color: themeColors.subText, fontSize: 11 }}>Fat</Text><Text style={{ color: getMacroColor(item?.fat || 0, dailyGoals.fat / 3, 'fat'), fontWeight: '600', fontSize: 13 }}>{item?.fat}g</Text></View>
                                <TouchableOpacity style={[styles.editIconBtn, { backgroundColor: themeColors.chip }]} onPress={() => openEdit(item)}><Text style={{ color: themeColors.primary, fontSize: 12, fontWeight: '600' }}>Edit</Text></TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* FAB with background bar */}
        <View style={[styles.fabBar, { backgroundColor: themeColors.bg }]}>
          <View style={styles.fabRow}>
            <TouchableOpacity style={styles.fabEqual} onPress={handleCameraCapture} disabled={isProcessing}>
              <LinearGradient colors={themeColors.gradient} style={styles.fabEqualInner}>
                <Camera size={24} color="#FFF" />
                <Text style={styles.fabText}>Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabEqual} onPress={handleGalleryPick} disabled={isProcessing}>
              <LinearGradient colors={themeColors.gradient} style={styles.fabEqualInner}>
                <LucideImage size={24} color="#FFF" />
                <Text style={styles.fabText}>Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ========== SETTINGS ==========
  const SettingsScreen = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => setScreen("home")}><ArrowLeft size={24} color={themeColors.primary} /></TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Account */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.cardLabel, { color: themeColors.text }]}>Account</Text>
        <View style={{ marginTop: 8, padding: 12, backgroundColor: isDarkMode ? currentTheme.chipDark : '#F3F4F6', borderRadius: 8 }}>
          <Text style={{ color: themeColors.text, fontSize: 15, fontWeight: '600' }}>{user?.displayName || user?.email?.split('@')[0]}</Text>
          {user?.email && <Text style={{ color: themeColors.subText, fontSize: 12, marginTop: 2 }}>{user.email}</Text>}
        </View>
        <TouchableOpacity style={[styles.logoutBtn, { marginTop: 12 }]} onPress={async () => { await signOut(); }}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Goals - link to Goal Planning */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.cardLabel, { color: themeColors.text }]}>Daily Goals</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: themeColors.subText, fontSize: 13 }}>Cal {dailyGoals.calories} · Pro {dailyGoals.protein}g · Carb {dailyGoals.carbs}g · Fat {dailyGoals.fat}g</Text>
        </View>
        <TouchableOpacity style={[styles.linkBtn, { backgroundColor: themeColors.chip, marginTop: 12 }]} onPress={() => setScreen("goalPlanning")}>
          <Text style={{ color: themeColors.primary, fontWeight: '600', fontSize: 13 }}>Edit Goals & Plan →</Text>
        </TouchableOpacity>
      </View>

      {/* Media Settings */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <View style={styles.toggleRow}>
          <Text style={{ color: themeColors.text, fontWeight: '600', flex: 1 }}>Save Food Photos</Text>
          <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: saveFoodPhotos ? themeColors.primary : themeColors.chip }]} onPress={() => setSaveFoodPhotos(!saveFoodPhotos)}>
            <Text style={{ color: saveFoodPhotos ? "#FFF" : themeColors.text, fontWeight: "600" }}>{saveFoodPhotos ? "ON" : "OFF"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.cardLabel, { color: themeColors.text }]}>Theme Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {THEME_NAMES.map(t => (
            <TouchableOpacity key={t} onPress={() => setThemeColor(t)} style={[styles.colorChip, { backgroundColor: THEMES[t].primary, borderWidth: 2, borderColor: themeColor === t ? "#FFF" : THEMES[t].primary }]}>
              <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 11 }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Help & Legal */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => setShowHowToUse(true)}>
          <HelpCircle size={20} color={themeColors.text} style={{ marginRight: 10 }} />
          <Text style={{ color: themeColors.text, fontWeight: '600' }}>How to Use</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: themeColors.chip }]} />
        <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => setScreen("privacy")}>
          <ShieldCheck size={20} color={themeColors.text} style={{ marginRight: 10 }} />
          <Text style={{ color: themeColors.text, fontWeight: '600' }}>Privacy Policy</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: themeColors.chip }]} />
        <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => setScreen("terms")}>
          <FileText size={20} color={themeColors.text} style={{ marginRight: 10 }} />
          <Text style={{ color: themeColors.text, fontWeight: '600' }}>Terms & Conditions</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: themeColors.chip }]} />
        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: themeColors.subText, fontSize: 12 }}>NutriSnap v1.0 · Made by NavyGeeks</Text>
        </View>
      </View>

      {/* Delete Account */}
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Text style={{ color: '#EF4444', fontWeight: '600', textAlign: 'center' }}>Delete Account</Text>
        </TouchableOpacity>
        <Text style={{ color: themeColors.subText, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          This will permanently delete your account and all data
        </Text>
      </View>
    </ScrollView >
  );

  // ========== LOGIN ==========
  const LoginScreen = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [forgotMsg, setForgotMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async () => {
      if (!email || !password) { showDialog('Error', 'Please fill in all fields'); return; }
      if (isSignUp && !agreed) { showDialog('Terms Required', 'Please agree to the Privacy Policy and Terms.'); return; }
      setLoading(true);
      const result = isSignUp ? await signUpWithEmail(email, password, displayName) : await signInWithEmail(email, password);
      setLoading(false);
      if (result.success) { setScreen("home"); }
      else { showDialog('Error', result.error); }
    };

    const handleForgot = async () => {
      if (!email) { setForgotMsg('Please enter your email above first.'); return; }
      setLoading(true);
      setForgotMsg("");
      const r = await resetPassword(email);
      setLoading(false);
      if (r.success) setForgotMsg(`Password reset link sent to ${email}. Check your spam folder too.`);
      else setForgotMsg(r.error);
    };

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, justifyContent: 'center', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image source={require('./assets/login_image.png')} style={{ width: 160, height: 160, borderRadius: 20 }} />
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.cardLabel, { color: themeColors.text, textAlign: 'center', fontSize: 18 }]}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>

            {isSignUp && (
              <>
                <Text style={[styles.inputLabel, { color: themeColors.text, marginTop: 16 }]}>Name</Text>
                <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={themeColors.subText}
                  style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />
              </>
            )}

            <Text style={[styles.inputLabel, { color: themeColors.text, marginTop: 16 }]}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={themeColors.subText} keyboardType="email-address" autoCapitalize="none"
              style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB" }]} />

            <Text style={[styles.inputLabel, { color: themeColors.text, marginTop: 12 }]}>Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput value={password} onChangeText={setPassword} placeholder="Min. 6 characters" placeholderTextColor={themeColors.subText} secureTextEntry={!showPassword}
                style={[styles.thinInput, { color: themeColors.text, borderColor: isDarkMode ? "#4B5563" : "#D1D5DB", flex: 1, paddingRight: 40 }]} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 16 }}>
                {showPassword ? <EyeOff size={20} color={themeColors.primary} /> : <Eye size={20} color={themeColors.primary} />}
              </TouchableOpacity>
            </View>

            {!isSignUp && (
              <View>
                <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={handleForgot} disabled={loading}>
                  <Text style={{ color: themeColors.primary, fontSize: 13, fontWeight: '500' }}>Forgot Password?</Text>
                </TouchableOpacity>
                {forgotMsg ? <Text style={{ color: forgotMsg.includes('sent') ? '#10B981' : '#EF4444', fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>{forgotMsg}</Text> : null}
              </View>
            )}

            {isSignUp && (
              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)}>
                <View style={[styles.checkbox, { borderColor: themeColors.primary, backgroundColor: agreed ? themeColors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
                  {agreed && <Check size={12} color="#FFF" />}
                </View>
                <Text style={{ color: themeColors.subText, fontSize: 12, flex: 1 }}>
                  I agree to the <Text style={{ color: themeColors.primary }}>Privacy Policy</Text> and <Text style={{ color: themeColors.primary }}>Terms</Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.primaryBtn, { overflow: 'hidden', marginTop: 20 }]} onPress={handleAuth} disabled={loading}>
              <LinearGradient colors={themeColors.gradient} style={StyleSheet.absoluteFill} />
              <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => { setIsSignUp(!isSignUp); setAgreed(false); }}>
              <Text style={{ color: themeColors.subText, fontSize: 13 }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feature Highlights */}
          <View style={{ marginTop: 32, marginBottom: 16 }}>
            <Text style={{ color: themeColors.subText, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>What you can do with NutriSnap</Text>
            {[
              { icon: Camera, title: "AI Food Analysis", desc: "Snap a photo, get instant nutrition data", color: "#3B82F6" },
              { icon: PieChartIcon, title: "Track & Analyze", desc: "Charts, trends, and personalized insights", color: "#8B5CF6" },
              { icon: Target, title: "Goal Planning", desc: "Custom calorie targets based on your goals", color: "#EF4444" },
              { icon: Trophy, title: "Streaks & Scores", desc: "Stay motivated with daily health scores", color: "#F59E0B" },
              { icon: TrendingUp, title: "Weight Tracking", desc: "Monitor your progress over time", color: "#EC4899" },
            ].map((f, i) => (
              <View key={i} style={[styles.quickCard, { backgroundColor: themeColors.card }]}>
                <f.icon size={28} color={f.color} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 15 }}>{f.title}</Text>
                  <Text style={{ color: themeColors.subText, fontSize: 12 }}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Legal Links */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setScreen("privacy")}>
              <Text style={{ color: themeColors.primary, fontSize: 13 }}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen("terms")}>
              <Text style={{ color: themeColors.primary, fontSize: 13 }}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: themeColors.subText, fontSize: 11, textAlign: 'center', marginTop: 16, marginBottom: 24 }}>Made by NavyGeeks · © NutriSnap 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const handleCloseEditModal = useCallback(() => { setEditModal(false); setEditItem(null); }, []);

  if (authLoading) {
    return (
      <SafeAreaProvider><PaperProvider theme={theme}>
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </SafeAreaView>
      </PaperProvider></SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={Platform.OS === 'web' ? { flex: 1, backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center' } : { flex: 1 }}>
        <View style={Platform.OS === 'web' ? { width: '100%', maxWidth: 480, height: '100%', overflow: 'hidden', backgroundColor: themeColors.bg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 } : { flex: 1 }}>
          <PaperProvider theme={theme}>
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
              <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
              {screen === "home" ? HomeScreen() :
                screen === "login" ? <LoginScreen /> :
                  screen === "reports" ? <ReportsScreen meals={meals} dailyGoals={dailyGoals} themeColors={themeColors} isDarkMode={isDarkMode} onBack={() => setScreen("home")} /> :
                    screen === "goalPlanning" ? <GoalPlanningScreen themeColors={themeColors} isDarkMode={isDarkMode} onBack={() => setScreen("home")} dailyGoals={dailyGoals} onUpdateGoals={handleUpdateGoals} setDailyGoals={setDailyGoals} /> :
                      screen === "privacy" ? <PrivacyPolicyScreen themeColors={themeColors} onBack={() => setScreen(user ? "settings" : "login")} /> :
                        screen === "terms" ? <TermsScreen themeColors={themeColors} onBack={() => setScreen(user ? "settings" : "login")} /> :
                          SettingsScreen()}

              <EditModal visible={editModal} editItem={editItem} setEditItem={setEditItem} onClose={handleCloseEditModal} onSave={saveEdit} onDelete={deleteMeal} themeColors={themeColors} isDarkMode={isDarkMode} />
              <ProcessingOverlay visible={isProcessing} status={processingStatus} themeColors={themeColors} />
              <NutritionDetailModal visible={showNutritionModal} onClose={() => setShowNutritionModal(false)} totals={todaysTotals} goals={dailyGoals} themeColors={themeColors} />
              <ScoreDetailModal visible={showScoreModal} onClose={() => setShowScoreModal(false)} scoreData={healthScoreData} themeColors={themeColors} />
              <StreakDetailModal visible={showStreakModal} onClose={() => setShowStreakModal(false)} streakData={streakData} themeColors={themeColors} />
              <HowToUseModal visible={showHowToUse} onClose={() => setShowHowToUse(false)} themeColors={themeColors} />
            </SafeAreaView>
          </PaperProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 },
  appTitle: { fontSize: 24, fontWeight: "bold" },
  // header uses plain emoji buttons, no headerBtn style needed
  // Hero
  heroCard: { marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginTop: 10 },
  progressFill: { height: 8, backgroundColor: '#FFF', borderRadius: 4 },
  // Cards
  scoreStreakRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10 },
  scoreCard: { flex: 1, padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  scoreNumber: { fontWeight: 'bold' },
  streakCard: { flex: 1, padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  // Insights
  insightsContainer: { marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14 },
  insightRow: { padding: 10, borderRadius: 10, marginTop: 6 },
  insightText: { fontSize: 13, lineHeight: 18 },
  sectionLabel: { marginLeft: 16, marginTop: 16, marginBottom: 6, fontWeight: "600", fontSize: 15 },
  // Filters
  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  // Meals
  mealCard: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 14, flexDirection: "row", alignItems: "center" },
  mealThumb: { width: 52, height: 52, borderRadius: 10, marginRight: 10 },
  mealName: { fontWeight: "600", fontSize: 14 },
  expandedMacros: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 14 },
  macroItem: { alignItems: 'center' },
  editIconBtn: { padding: 6, borderRadius: 6, marginLeft: 'auto' },
  emptyState: { alignItems: "center", marginTop: 90, marginBottom: 40 },
  // Quick access cards
  quickCard: { marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  // FAB
  fabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 6, paddingTop: 10, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  fabRow: { flexDirection: 'row', gap: 10 },
  fabEqual: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  fabEqualInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  // Settings
  settingsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  settingsTitle: { fontSize: 20, fontWeight: "bold" },
  card: { padding: 16, borderRadius: 14, marginBottom: 12 },
  cardLabel: { fontWeight: "600", fontSize: 16, marginBottom: 4 },
  thinInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6, fontSize: 14, height: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 56, alignItems: 'center' },
  divider: { height: 1, marginVertical: 8 },
  linkBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  modeChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  colorChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  logoutBtn: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, alignItems: "center" },
  deleteAccountBtn: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444' },
  // Login
  primaryBtn: { padding: 14, borderRadius: 10, alignItems: "center" },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { marginBottom: 2, marginTop: 8, fontWeight: "500" },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  deleteBtn: { backgroundColor: "#EF4444", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 12 },
  viewPhotoBtn: { padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  processingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  processingCard: { padding: 32, borderRadius: 20, alignItems: "center", width: "80%" },
  processingText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
  fullImageOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  fullImageContainer: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "95%", height: "80%" },
  closeImageBtn: { position: "absolute", bottom: 50, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  detailModalContent: { width: '90%', borderRadius: 20, padding: 20, maxHeight: '85%' },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 8 },
  modalCloseBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  nutritionDetailRow: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 10, alignItems: 'flex-start' },
  nutritionProgressBg: { height: 6, borderRadius: 3, width: '100%' },
  nutritionProgressFill: { height: 6, borderRadius: 3 },
  howToStep: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
});
