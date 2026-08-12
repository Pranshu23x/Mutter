import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { AccountOptionRow, EditProfileModal, SoftTouchableOpacity, styles } from "../App";

export default function AccountScreen({ onBack }) {
  const [firstName, setFirstName] = useState("Pranshu");
  const [lastName, setLastName] = useState("");
  const [draftFirstName, setDraftFirstName] = useState("Pranshu");
  const [draftLastName, setDraftLastName] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (editOpen) {
      setDraftFirstName(firstName);
      setDraftLastName(lastName);
    }
  }, [editOpen, firstName, lastName]);

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Pranshu";
  const initial = firstName.trim().charAt(0).toUpperCase() || "P";

  const handleSaveProfile = () => {
    setFirstName(draftFirstName.trim() || "Pranshu");
    setLastName(draftLastName.trim());
    setEditOpen(false);
  };

  return (
    <SafeAreaView style={styles.accountSafe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.accountContent}
      >
        <View style={styles.accountTopBar}>
          <SoftTouchableOpacity onPress={onBack} style={styles.accountBackButton}>
            <Text style={styles.accountBackGlyph}>{"\u2190"}</Text>
          </SoftTouchableOpacity>
          <Text style={styles.accountTitle}>Account</Text>
          <View style={styles.accountTopSpacer} />
        </View>

        <SoftTouchableOpacity onPress={() => setEditOpen(true)} style={styles.accountProfileCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>{initial}</Text>
          </View>
          <Text style={styles.drawerName}>{fullName}</Text>
          <Text style={styles.drawerEmail}>pranshukr006@gmail.com</Text>
          <View style={styles.drawerPlanPill}>
            <Text style={styles.drawerPlanText}>Basic</Text>
          </View>
        </SoftTouchableOpacity>

        <View style={styles.accountOptionCard}>
          <AccountOptionRow label="View privacy policy" />
          <View style={styles.accountDivider} />
          <AccountOptionRow label="How to use Mutter Android" />
        </View>

        <SoftTouchableOpacity style={styles.accountSignOutCard}>
          <Text style={styles.accountSignOutText}>Sign out</Text>
        </SoftTouchableOpacity>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        firstName={draftFirstName}
        lastName={draftLastName}
        onChangeFirstName={setDraftFirstName}
        onChangeLastName={setDraftLastName}
        onCancel={() => setEditOpen(false)}
        onSave={handleSaveProfile}
      />
    </SafeAreaView>
  );
}
