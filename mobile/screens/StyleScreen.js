import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import {
  AppChip,
  BrandMark,
  SegmentTabs,
  SoftTouchableOpacity,
  STYLE_TABS,
  StyleCard,
  styles,
} from "../App";

export default function StyleScreen({ onOpenDrawer }) {
  const [activeTab, setActiveTab] = useState("personal");
  const active = STYLE_TABS.find((tab) => tab.key === activeTab) || STYLE_TABS[0];

  return (
    <SafeAreaView style={styles.styleSafe}>
      <StatusBar style="dark" />

      <View style={styles.styleScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.styleContent}
        >
          <View style={styles.topBar}>
            <SoftTouchableOpacity onPress={onOpenDrawer} style={styles.menuButton}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </SoftTouchableOpacity>

            <View style={styles.brandWrap}>
              <BrandMark />
              <Text style={styles.brandText}>Wispr Flow</Text>
            </View>
          </View>

          <SegmentTabs
            tabs={STYLE_TABS}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          <View style={styles.appRow}>
            {active.apps.map((app, index) => (
              <View
                key={`${active.key}-${app.type}`}
                style={[styles.appChipWrap, index > 0 && styles.appChipOverlap]}
              >
                <AppChip type={app.type} accent={app.accent} />
              </View>
            ))}
          </View>

          <Text style={styles.caption}>{active.caption}</Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Make Flow sound like you</Text>
            <Text style={styles.heroSubtitle}>
              Flow adapts to how you write in different apps
            </Text>
            <SoftTouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Start now</Text>
            </SoftTouchableOpacity>
          </View>

          <StyleCard
            title={active.title}
            subtitle={active.subtitle}
            preview={active.preview}
          />

          <Text style={styles.footerText}>
            Styles currently apply in English only
          </Text>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
