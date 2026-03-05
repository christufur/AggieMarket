import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type SortRowProps = {
  resultCount: number;
  sortLabel?: string;
  onSortPress?: () => void;
};

export function SortRow({
  resultCount,
  sortLabel = "Sort: Newest ▾",
  onSortPress,
}: SortRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.count}>{resultCount} results</Text>
      <Pressable style={styles.drop} onPress={onSortPress}>
        <Text style={styles.dropText}>{sortLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  count: {
    fontSize: 10,
    color: colors.dark,
  },
  drop: {
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dropText: {
    fontSize: 10,
    color: colors.ink,
  },
});
