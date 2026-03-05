import { ScrollView, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type CategoryTabsProps = {
  tabs: readonly string[];
  active: string;
  onSelect: (tab: string) => void;
};

export function CategoryTabs({ tabs, active, onSelect }: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onSelect(tab)}
          style={[styles.tab, tab === active && styles.tabOn]}
        >
          <Text
            style={[styles.tabText, tab === active && styles.tabTextOn]}
            numberOfLines={1}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 31,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  scroll: {
    flexDirection: "row",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabOn: {
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 10,
    color: colors.dark,
  },
  tabTextOn: {
    color: colors.ink,
    fontWeight: "700",
  },
});
