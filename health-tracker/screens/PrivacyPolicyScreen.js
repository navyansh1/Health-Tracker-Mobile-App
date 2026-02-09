// ============================================================================
// PRIVACY POLICY SCREEN - NutriSnap
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={[styles.backText, { color: themeColors.primary, fontSize: 22 }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Privacy Policy</Text>
                    <View style={{ width: 50 }} />
                </View>

                <View style={[styles.card, { backgroundColor: themeColors.card }]}>
                    <Text style={[styles.lastUpdated, { color: themeColors.subText }]}>Last Updated: February 7, 2026</Text>

                    <Section title="1. Introduction">
                        {`NutriSnap ("we," "our," or "us") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the NutriSnap mobile application (the "App") available on iOS and Android platforms.

By downloading, installing, or using NutriSnap, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the App.`}
                    </Section>

                    <Section title="2. Information We Collect">
                        {`We collect the following types of information:

a) Account Information
When you create an account, we collect your name, email address, and password. This information is required to provide you with a personalized experience and to secure your account.

b) Health and Nutrition Data
- Meal logs including food names, calorie counts, and macronutrient data (protein, carbohydrates, fat, fiber, sugar, sodium)
- Daily nutritional goals and preferences
- Weight entries and body metrics (height, age, gender)
- Fitness goals and activity level selections
- Meal photos (only if you enable the "Save Food Photos" feature)

c) Usage Data
- App interaction patterns (screens visited, features used)
- Device information (device type, operating system version)
- Crash reports and performance data

d) Food Photos
When you use the camera or gallery feature to analyze food, the image is processed by Google's Gemini AI service for nutritional analysis. If you enable the "Save Food Photos" option, photos are stored in Firebase Cloud Storage associated with your account.

e) Notification Preferences
If you enable Smart Reminders, we store your notification preferences locally on your device and use them to schedule helpful reminders.`}
                    </Section>

                    <Section title="3. How We Use Your Information">
                        {`We use the information we collect for the following purposes:

- To provide and maintain the App's core functionality, including AI-powered food analysis and nutritional tracking
- To personalize your experience, including calculating daily health scores, streak tracking, and weekly insights
- To calculate and recommend personalized calorie and macronutrient targets based on your fitness goals
- To generate nutrition reports and analytics
- To send you Smart Reminders and notifications (only if you opt in)
- To sync your data across your devices via cloud storage
- To improve and optimize the App's performance and user experience
- To respond to your requests, comments, or questions
- To comply with legal obligations`}
                    </Section>

                    <Section title="4. Third-Party Services">
                        {`NutriSnap uses the following third-party services:

a) Firebase (by Google)
We use Firebase for authentication (account management), Firestore (data storage), and Cloud Storage (photo storage). Firebase may collect device identifiers and usage data. For more information, see Google's Privacy Policy at https://policies.google.com/privacy.

b) Google Gemini AI
Food photos are sent to Google's Gemini AI service for nutritional analysis. Google processes these images in accordance with their AI terms of service. Images are sent for processing only and are not stored by Google for model training unless separately agreed to.

c) Expo
The App is built using Expo, which may collect anonymous crash reports and performance metrics. See Expo's privacy policy at https://expo.dev/privacy.

We do not sell, trade, or rent your personal information to third parties. We do not share your health or nutrition data with advertisers.`}
                    </Section>

                    <Section title="5. Data Storage and Security">
                        {`Your data is stored securely using Firebase services hosted by Google Cloud Platform. We implement the following security measures:

- All data transmission is encrypted using TLS/SSL
- User authentication is managed through Firebase Authentication with industry-standard security
- Firestore security rules ensure users can only access their own data
- Passwords are hashed and never stored in plain text
- API keys are managed server-side and are not exposed in the client application

While we strive to use commercially acceptable means to protect your personal data, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.`}
                    </Section>

                    <Section title="6. Data Retention">
                        {`We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us.

Upon account deletion:
- Your meal logs, weight entries, and goal plans will be permanently deleted
- Your uploaded food photos will be removed from cloud storage
- Your account credentials will be removed from our authentication system

Some anonymized, aggregated data may be retained for analytical purposes after account deletion.`}
                    </Section>

                    <Section title="7. Your Rights and Choices">
                        {`Depending on your jurisdiction, you may have the following rights:

a) Access: You may request a copy of the personal data we hold about you.

b) Correction: You may update or correct your personal information through the App's settings or by contacting us.

c) Deletion: You may request deletion of your account and all associated data.

d) Data Portability: You may request your data in a structured, commonly used format.

e) Opt-Out: You may disable notifications, photo storage, and other optional features at any time through the App's settings.

f) Withdraw Consent: Where processing is based on consent, you may withdraw it at any time.

To exercise any of these rights, please contact us at the email address provided below.`}
                    </Section>

                    <Section title="8. Children's Privacy">
                        {`NutriSnap is not intended for use by children under the age of 13 (or the applicable age of consent in your jurisdiction). We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us so that we can take appropriate action to delete such information.`}
                    </Section>

                    <Section title="9. International Data Transfers">
                        {`Your information may be transferred to and maintained on servers located outside of your country of residence, where data protection laws may differ. By using the App, you consent to the transfer of information to countries outside of your country of residence, including the United States, where Google's Firebase servers may be located.

We ensure that any such transfers comply with applicable data protection laws and that your data remains protected to the standards described in this Privacy Policy.`}
                    </Section>

                    <Section title="10. Changes to This Privacy Policy">
                        {`We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the App and updating the "Last Updated" date at the top of this page.

You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted within the App. Your continued use of the App after any modification to this Privacy Policy will constitute your acknowledgment of the modifications and your consent to abide by the modified Privacy Policy.`}
                    </Section>

                    <Section title="11. Contact Us">
                        {`If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:

Email: navyvibrance@gmail.com

We will respond to all legitimate requests within 30 days.`}
                    </Section>

                    <Section title="12. California Privacy Rights (CCPA)">
                        {`If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

- Right to know what personal information is collected, used, shared, or sold
- Right to delete personal information held by businesses
- Right to opt-out of sale of personal information (we do not sell personal information)
- Right to non-discrimination for exercising CCPA rights

To exercise these rights, please contact us using the information provided above.`}
                    </Section>

                    <Section title="13. European Users (GDPR)">
                        {`If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR):

Legal Basis for Processing:
- Consent: For processing food photos and optional features
- Contract Performance: For providing core App functionality
- Legitimate Interest: For improving the App and ensuring security

Data Protection Officer: For GDPR-related inquiries, please contact us at the email address above.

Supervisory Authority: You have the right to lodge a complaint with your local data protection supervisory authority if you believe your data has been processed unlawfully.`}
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
