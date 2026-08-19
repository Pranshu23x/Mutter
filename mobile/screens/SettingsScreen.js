import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SettingsRow, SoftTouchableOpacity, ToggleSettingsRow, styles } from "../App";

const OPACITY_OPTIONS = [25, 50, 75, 100];

export default function SettingsScreen({ onBack, bubbleOpacity = 0.55, onBubbleOpacityChange }) {
  const [privacyOn, setPrivacyOn] = useState(true);
  const [cloudSyncOn, setCloudSyncOn] = useState(false);
  const [opacityModalVisible, setOpacityModalVisible] = useState(false);
  const [opacityDraft, setOpacityDraft] = useState(Math.round(bubbleOpacity * 100));

  useEffect(() => {
    setOpacityDraft(Math.round(bubbleOpacity * 100));
  }, [bubbleOpacity]);

  const saveOpacity = async () => {
    await onBubbleOpacityChange?.(opacityDraft / 100);
    setOpacityModalVisible(false);
  };

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
            title="Output language"
            subtitle="English - British"
          />
          <View style={styles.settingsDivider} />
          <SettingsRow title="Mutter Bubble Size" showChevron />
          <View style={styles.settingsDivider} />
          <SettingsRow
            title="Mutter Bubble Opacity"
            subtitle={`${opacityDraft}%`}
            showChevron
            onPress={() => setOpacityModalVisible(true)}
          />
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

        <Text style={styles.settingsVersion}>APP VERSION V1.0</Text>
      </ScrollView>

      <Modal
        visible={opacityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOpacityModalVisible(false)}
      >
        <View style={opacityStyles.modalBackdrop}>
          <View style={opacityStyles.modalCard}>
            <Text style={opacityStyles.modalTitle}>Bubble opacity</Text>
            <Text style={opacityStyles.modalDescription}>
              Choose how transparent the Mutter bubble should look.
            </Text>

            <View style={opacityStyles.optionsRow}>
              {OPACITY_OPTIONS.map((option) => {
                const selected = opacityDraft === option;
                return (
                  <SoftTouchableOpacity
                    key={option}
                    onPress={() => setOpacityDraft(option)}
                    style={[opacityStyles.option, selected && opacityStyles.optionSelected]}
                  >
                    <Text style={[opacityStyles.optionText, selected && opacityStyles.optionTextSelected]}>
                      {option}%
                    </Text>
                  </SoftTouchableOpacity>
                );
              })}
            </View>

            <SoftTouchableOpacity onPress={saveOpacity} style={opacityStyles.saveButton}>
              <Text style={opacityStyles.saveButtonText}>Save</Text>
            </SoftTouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const opacityStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 17, 17, 0.28)",
    justifyContent: "center",
    padding: 28,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: "#25232a",
    fontSize: 24,
  },
  modalDescription: {
    color: "#77737f",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  option: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0e9fc",
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: "#4f4b56",
  },
  optionText: {
    color: "#4f4b56",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#ffffff",
  },
  saveButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#4f4b56",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
  },
});
