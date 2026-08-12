import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import {
  BrandMark,
  HomeBannerCard,
  HomeDictationCard,
  HomePagerDots,
  SoftTouchableOpacity,
  styles,
} from "../App";

export default function HomeScreen({ onOpenDrawer }) {
  return (
    <SafeAreaView style={styles.homeSafe}>
      <StatusBar style="dark" />

      <View style={styles.homeScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.homeContent}
        >
          <View style={styles.homeTopBar}>
            <SoftTouchableOpacity onPress={onOpenDrawer} style={styles.homeMenuButton}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </SoftTouchableOpacity>

            <View style={styles.homeBrandWrap}>
              <BrandMark />
              <Text style={styles.brandText}>Wispr Flow</Text>
            </View>

            <View style={styles.homeTopSpacer} />
          </View>

          <HomeBannerCard />
          <HomePagerDots />
          <HomeDictationCard />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
