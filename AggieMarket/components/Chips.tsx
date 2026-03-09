import { ScrollView, Text, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type ChipsProps = {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function Chips({ options, selected, onSelect }: ChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.chip, opt === selected && styles.chipOn]}
        >
          <Text
            style={[styles.chipText, opt === selected && styles.chipTextOn]}
            numberOfLines={1}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 20,
  },
  chipOn: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  chipText: {
    fontSize: 10,
    color: colors.dark,
  },
  chipTextOn: {
    color: colors.white,
    fontWeight: "700",
  },
});
