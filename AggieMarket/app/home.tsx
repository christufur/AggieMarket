import { View, Text, ScrollView, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopNav, SectionHeader, CardH } from "../components";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import React from "react";

// listing structure
const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];
type Listing = {
  id: string;
  title: string;
  description: string;
  condition: string;
  price: string;
  isFree: boolean;
  negotiable: boolean;
  isNew?: boolean;
};

//empty listing 
const EMPTY_LISTING: Listing = {
  id: "",
  title: "",
  description: "",
  condition: "Good",
  price: "",
  isFree: false,
  negotiable: false,
  isNew: false
};

//LISTING CREATION MODAL
function CreateListingModal({visible, onClose, onSave} :{ 
  visible: boolean; onClose: () => void; onSave: (listing: Listing) => void;
  }) {
  const [form, setForm] = React.useState<Listing>(EMPTY_LISTING);
  function set<K extends keyof Listing>(key: K, value: Listing[K]) {
      setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveListing() {
    if (!form.title.trim()) {
      Alert.alert("Missing title", "Please enter a title for your listing.");
      return;
    }
    if (!form.isFree && !form.price.trim()) {
      Alert.alert("Missing price", "Enter a price or mark the item as free.");
      return;
    }

    const newListing: Listing = {
        id: Date.now().toString(),
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        price: form.isFree ? "Free" : form.price.trim(),
        isFree: form.isFree,
        negotiable: form.negotiable,
        isNew: true,
      };

      onSave(newListing);
      setForm(EMPTY_LISTING); // reset for next time
      onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modal.safe} edges={["top", "bottom"]}>

        {/* header */}
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modal.headerTitle}>New Listing</Text>
          <TouchableOpacity onPress={saveListing}>
            <Text style={modal.post}>Post</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.scrollContent}>

          {/* title */}
          <Text style={modal.label}>Title *</Text>
          <TextInput
            style={modal.input}
            placeholder="e.g. Calc Textbook"
            placeholderTextColor={colors.dark}
            value={form.title}
            onChangeText={(v) => set("title", v)}
          />

          {/* description */}
          <Text style={modal.label}>Description</Text>
          <TextInput
            style={[modal.input, modal.textarea]}
            placeholder="Describe your item…"
            placeholderTextColor={colors.dark}
            value={form.description}
            onChangeText={(v) => set("description", v)}
            multiline
            numberOfLines={4}
          />

          {/* condition */}
          <Text style={modal.label}>Condition</Text>
          <View style={modal.pills}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[modal.pill, form.condition === c && modal.pillActive]}
                onPress={() => set("condition", c)}
              >
                <Text style={[modal.pillText, form.condition === c && modal.pillTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* free toggle */}
          <View style={modal.row}>
            <Text style={modal.label}>Free item</Text>
            <Switch
              value={form.isFree}
              onValueChange={(v) => set("isFree", v)}
            />
          </View>

          {/* price — hidden when free */}
          {!form.isFree && (
            <>
              <Text style={modal.label}>Price *</Text>
              <TextInput
                style={modal.input}
                placeholder="e.g. $25"
                placeholderTextColor={colors.dark}
                value={form.price}
                onChangeText={(v) => set("price", v)}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {/* negotiable toggle */}
          <View style={modal.row}>
            <Text style={modal.label}>Negotiable</Text>
            <Switch
              value={form.negotiable}
              onValueChange={(v) => set("negotiable", v)}
            />
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}  // end of CreateListingModal


// static data for demo 
const SEED_LISTINGS: Listing[] = [
  { id: "1", title: "Calc Textbook",  condition: "Good",     price: "$25",  isFree: false, negotiable: true,  description: "" },
  { id: "2", title: "Desk Lamp",      condition: "Like New", price: "$15",  isFree: false, negotiable: false, description: "" },
  { id: "3", title: "MacBook Pro",    condition: "Good",     price: "$400", isFree: false, negotiable: true,  description: "" },
  { id: "4", title: "TI-84 Plus",     condition: "Good",     price: "$45",  isFree: false, negotiable: false, description: "" },
];

const popularListings = [
  { title: "Math Tutoring", price: "$20/hr", id: "s1" },
  { title: "Logo Design",   price: "$50",    id: "s2" },
  { title: "Resume Help",   price: "$30",    id: "s3" },
];

const popularServices = [
  { title: "Math Tutoring", price: "$20/hr", id: "s1" },
  { title: "Logo Design",   price: "$50",    id: "s2" },
  { title: "Resume Help",   price: "$30",    id: "s3" },
];

const events = [
  { title: "Spring Fair",  sub: "Mar 15 · Free", id: "e1" },
  { title: "Study Night",  sub: "Mar 18 · Free", id: "e2" },
  { title: "Job Fair",     sub: "Mar 22 · Free", id: "e3" },
];

// home screen 
export default function HomeScreen() {
  const { user } = useAuth();
  // TODO: user name appears as "Test" after login 
  const firstName = user?.name ? user.name.split(" ")[0] : "Aggie";

  const [listings, setListings] = React.useState<Listing[]>(SEED_LISTINGS);
  const [isCreateVisible, setCreateVisible] = React.useState(false);

  // TODO: add to the DB
  function handleSaveListing(newListing: Listing) {
    // show the newest listing
    setListings((prev) => [newListing, ...prev]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopNav onAdd={() => setCreateVisible(true)}/>
        
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.heroSub}>
            Discover verified listings from NMSU students
          </Text>
        </View>

        <SectionHeader title="Popular Listings" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hStrip}
        >
          {listings.map((item) => (
            <CardH
              key={item.id}
              title={item.title}
              price={item.price}
            />
          ))}
        </ScrollView>

        <SectionHeader title="Popular Services" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hStrip}
        >
          {popularServices.map((item) => (
            <CardH
              key={item.id}
              title={item.title}
              price={item.price}
            />
          ))}
        </ScrollView>

        <SectionHeader title="Events" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hStrip}
        >
          {events.map((item) => (
            <CardH
              key={item.id}
              title={item.title}
              sub={item.sub}
            />
          ))}
        </ScrollView>
      </ScrollView>

      <CreateListingModal
        visible={isCreateVisible}
        onClose={() => setCreateVisible(false)}
        onSave={handleSaveListing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  heroSub: {
    fontSize: 11,
    color: colors.dark,
    marginTop: 3,
  },
  hStrip: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});

const modal = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle:   { fontSize: 15, fontWeight: "700", color: colors.ink },
  cancel:        { fontSize: 14, color: colors.dark },
  post:          { fontSize: 14, fontWeight: "700", color: colors.ink },
  scrollContent: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  textarea:       { minHeight: 90, textAlignVertical: "top" },
  pills:          { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive:     { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText:       { fontSize: 12, color: colors.ink },
  pillTextActive: { color: colors.white, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
