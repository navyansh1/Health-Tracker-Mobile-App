// ============================================================================
// NOTIFICATION SERVICE - Smart Reminders for NutriSnap
// ============================================================================
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";

const STORAGE_KEYS = {
    NOTIFICATIONS_ENABLED: "@nutrisnap_notifications_enabled",
    REMINDER_TIME: "@nutrisnap_reminder_time",
    IGNORED_COUNT: "@nutrisnap_ignored_count",
    LAST_NOTIFICATION_DATE: "@nutrisnap_last_notification_date",
    DAILY_NOTIFICATION_COUNT: "@nutrisnap_daily_count",
};

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================
export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === "granted";
}

export async function getNotificationSettings() {
    try {
        const enabled = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
        const reminderTime = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_TIME);
        return {
            enabled: enabled !== "false",
            reminderTime: reminderTime || "18:00",
        };
    } catch {
        return { enabled: true, reminderTime: "18:00" };
    }
}

export async function setNotificationSettings(settings) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(settings.enabled));
        if (settings.reminderTime) {
            await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_TIME, settings.reminderTime);
        }
    } catch (e) {
        console.log("Error saving notification settings:", e);
    }
}

// ============================================================================
// SMART REMINDER LOGIC
// ============================================================================
async function canSendNotification() {
    try {
        const settings = await getNotificationSettings();
        if (!settings.enabled) return false;

        // Check daily limit (max 2 per day)
        const today = format(new Date(), "yyyy-MM-dd");
        const lastDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION_DATE);
        const countStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_NOTIFICATION_COUNT);
        let count = parseInt(countStr || "0");

        if (lastDate !== today) {
            count = 0;
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_NOTIFICATION_DATE, today);
        }

        if (count >= 2) return false;

        // Check if ignored for 3 consecutive days
        const ignoredStr = await AsyncStorage.getItem(STORAGE_KEYS.IGNORED_COUNT);
        const ignored = parseInt(ignoredStr || "0");
        if (ignored >= 3) return false;

        return true;
    } catch {
        return false;
    }
}

async function incrementNotificationCount() {
    try {
        const countStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_NOTIFICATION_COUNT);
        const count = parseInt(countStr || "0") + 1;
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_NOTIFICATION_COUNT, String(count));
    } catch { }
}

export async function resetIgnoredCount() {
    await AsyncStorage.setItem(STORAGE_KEYS.IGNORED_COUNT, "0");
}

// ============================================================================
// REMINDER TYPES
// ============================================================================
const REMINDERS = {
    DAILY_LOGGING: {
        title: "NutriSnap",
        body: "You haven't logged any meals today — it only takes 30 seconds.",
    },
    STREAK_PROTECTION: {
        title: "Keep Your Streak",
        body: "One log today keeps your streak alive.",
    },
    LOW_PROTEIN: {
        title: "Protein Check",
        body: "Low protein today — a small boost can help.",
    },
    WEEKLY_SUMMARY: {
        title: "Weekly Report Ready",
        body: "Your weekly nutrition report is ready.",
    },
    LUNCH_REMINDER: {
        title: "🥗 Lunch Time!",
        body: "Snap a photo of your lunch to track your nutrition.",
    },
    DINNER_REMINDER: {
        title: "🍽️ Dinner Time",
        body: "Don't forget to log your dinner! It only takes a moment.",
    },
};

// ============================================================================
// SCHEDULE REMINDERS
// ============================================================================
export async function scheduleFixedDailyReminders() {
    // Schedule Lunch Reminder (12:00 PM)
    await Notifications.scheduleNotificationAsync({
        content: {
            title: REMINDERS.LUNCH_REMINDER.title,
            body: REMINDERS.LUNCH_REMINDER.body,
            sound: true,
        },
        trigger: {
            hour: 12,
            minute: 0,
            repeats: true,
        },
    });

    // Schedule Dinner Reminder (7:00 PM)
    await Notifications.scheduleNotificationAsync({
        content: {
            title: REMINDERS.DINNER_REMINDER.title,
            body: REMINDERS.DINNER_REMINDER.body,
            sound: true,
        },
        trigger: {
            hour: 19,
            minute: 0,
            repeats: true,
        },
    });

    await scheduleWeeklySummary();
}
export async function scheduleDailyReminder(hasLoggedToday, hasActiveStreak) {
    if (!(await canSendNotification())) return;

    const reminder = hasActiveStreak && !hasLoggedToday
        ? REMINDERS.STREAK_PROTECTION
        : REMINDERS.DAILY_LOGGING;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: reminder.title,
            body: reminder.body,
            sound: true,
        },
        trigger: null, // Immediate
    });

    await incrementNotificationCount();
}

export async function scheduleLowProteinReminder() {
    if (!(await canSendNotification())) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: REMINDERS.LOW_PROTEIN.title,
            body: REMINDERS.LOW_PROTEIN.body,
            sound: true,
        },
        trigger: null,
    });

    await incrementNotificationCount();
}

export async function scheduleWeeklySummary() {
    // Schedule for Sunday evening at 8 PM
    await Notifications.scheduleNotificationAsync({
        content: {
            title: REMINDERS.WEEKLY_SUMMARY.title,
            body: REMINDERS.WEEKLY_SUMMARY.body,
            sound: true,
        },
        trigger: {
            weekday: 1, // Sunday
            hour: 20,
            minute: 0,
            repeats: true,
        },
    });
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================================================
// CHECK AND TRIGGER REMINDERS
// ============================================================================
export async function checkAndTriggerReminders({ meals, dailyGoals, currentStreak }) {
    const settings = await getNotificationSettings();
    if (!settings.enabled) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const todaysMeals = meals.filter((m) => m?.date === today);
    const hasLoggedToday = todaysMeals.length > 0;

    // Daily logging reminder
    if (!hasLoggedToday) {
        await scheduleDailyReminder(false, currentStreak > 0);
        return;
    }

    // Low protein reminder
    const todaysProtein = todaysMeals.reduce((s, m) => s + (m?.protein || 0), 0);
    if (todaysProtein < dailyGoals.protein * 0.5) {
        await scheduleLowProteinReminder();
    }
}
