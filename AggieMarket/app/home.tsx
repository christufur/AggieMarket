import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopNav, SectionHeader, CardH } from "../components";
import { colors } from "../theme/colors";

const popularListings = [
  { title: "Calc Textbook", price: "$25", id: "1" },
  { title: "Desk Lamp", price: "$15", id: "2" },
  { title: "MacBook Pro", price: "$400", id: "3" },
  { title: "TI-84 Plus", price: "$45", id: "4" },
];

const popularServices = [
  { title: "Math Tutoring", price: "$20/hr", id: "5" },
  { title: "Logo Design", price: "$50", id: "6" },
  { title: "Resume Help", price: "$30", id: "7" },
];

const events = [
  { title: "Spring Fair", sub: "Mar 15 · Free", id: "e1" },
  { title: "Study Night", sub: "Mar 18 · Free", id: "e2" },
  { title: "Job Fair", sub: "Mar 22 · Free", id: "e3" },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopNav />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome back, Alex 👋</Text>
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
          {popularListings.map((item) => (
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
