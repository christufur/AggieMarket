import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";

type SectionHeaderProps = {
  title: string;
  seeAllHref?: string;
};

export function SectionHeader({ title, seeAllHref }: SectionHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {seeAllHref && (
        <Pressable onPress={() => router.push(seeAllHref as any)}>
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 7,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  seeAll: {
    fontSize: 10,
    color: colors.dark,
    textDecorationLine: "underline",
  },
});
