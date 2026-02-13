// ============================================================================
// PRIVACY POLICY SCREEN - NutriSnap (Simplified)
// ============================================================================
import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";

export default function PrivacyPolicyScreen({ themeColors, onBack }) {
    const Section = ({ title, children }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{title}</Text>
            <Text style={[styles.sectionBody, { color: themeColors.subText }]}>{children}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={[styles.backText, { color: themeColors.primary, fontSize: 22 }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Privacy Policy</Text>
                    <View style={{ width: 50 }} />
                </View>

                <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                    <Text style={[styles.lastUpdated, { color: themeColors.subText }]}>Last Updated: February 13, 2026</Text>

                    <Section title="1. Information We Collect">
                        {`To provide our service, we collect:
- Account details (Email, Name)
- Nutrition logs (Meal types, calories, macros)
- Health metrics (Weight/height if provided)
- Food photos (Only if 'Save Food Photos' is enabled)`}
                    </Section>

                    <Section title="2. How We Use It">
                        We use your data to analyze nutrition via AI, track your progress, sync data across devices, and improve app functionality.
                    </Section>

                    <Section title="3. Third Parties">
                        {`We use trusted services to handle your data:
- Firebase: For authentication, data storage, and photography storage.
- Google Gemini: To process food photos for nutritional analysis.
- Storage: Images for analysis are processed via Google's AI services.`}
                    </Section>

                    <Section title="4. Security & Deletion">
                        All data is encrypted. You have the right to delete your account and all associated data at any time through the app settings.
                    </Section>

                    <Section title="5. Your Choices">
                        You can opt-out of photo storage or stop using the app at any time. We do not sell your personal data to third parties.
                    </Section>

                    <Section title="6. Contact Us">
                        Email: navygeeks@gmail.com
                    </Section>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: { padding: 16, paddingBottom: 32 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    backButton: { padding: 4 },
    backText: { fontSize: 16, fontWeight: "600" },
    headerTitle: { fontSize: 22, fontWeight: "bold" },
    card: { borderRadius: 16, padding: 16 },
    lastUpdated: { fontSize: 12, marginBottom: 16, fontStyle: "italic" },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
    sectionBody: { fontSize: 13, lineHeight: 20 },
});
