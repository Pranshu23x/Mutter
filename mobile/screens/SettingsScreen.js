import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { SettingsRow, SoftTouchableOpacity, ToggleSettingsRow, styles } from "../App";

export default function SettingsScreen({ onBack }) {
  const [privacyOn, setPrivacyOn] = useState(true);
  const [cloudSyncOn, setCloudSyncOn] = useState(false);

  return (
    <SafeAreaView style={styles.settingsSafe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.settingsContent}
      >
        <View style={styles.settingsTopBar}>
          <SoftTouchableOpacity onPress={onBack} style={styles.settingsBackButton}>
            <Text style={styles.settingsBackGlyph}>{"\u2190"}</Text>
          </SoftTouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={styles.settingsTopSpacer} />
        </View>

        <Text style={styles.settingsSectionLabel}>GENERAL</Text>

        <View style={styles.settingsCard}>
          <SettingsRow
            title="Languages"
            subtitle="English - British"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow title="Flow Bubble Size" showChevron />
          <View style={styles.settingsDivider} />
          <SettingsRow title="Flow Bubble Opacity" showChevron />
        </View>

        <Text style={[styles.settingsSectionLabel, styles.settingsSectionSpacing]}>
          DATA & PRIVACY
        </Text>

        <View style={styles.settingsCard}>
          <ToggleSettingsRow
            title="Privacy mode"
            description="Your data will not be used to improve or train AI models, by Wispr or any third party."
            value={privacyOn}
            onToggle={() => setPrivacyOn((current) => !current)}
          />
          <View style={styles.settingsToggleSpacer} />
          <ToggleSettingsRow
            title="Cloud Sync"
            description="Stores transcripts and audio on Wispr servers to enable cross-device sync"
            value={cloudSyncOn}
            onToggle={() => setCloudSyncOn((current) => !current)}
            valueStyle="off"
          />
        </View>

        <Text style={styles.settingsVersion}>APP VERSION 2.1.3</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
