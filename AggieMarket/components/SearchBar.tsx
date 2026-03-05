import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type SearchBarProps = {
  value?: string;
  placeholder?: string;
  muted?: boolean;
  onChangeText?: (text: string) => void;
};

export function SearchBar({
  value,
  placeholder = "Search...",
  muted,
  onChangeText,
}: SearchBarProps) {
  return (
    <View style={[styles.wrap, muted && styles.muted]}>
      <Ionicons
        name="search"
        size={16}
        color={muted ? colors.mid : colors.ink}
      />
      <TextInput
        style={[styles.input, muted && styles.inputMuted]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.mid}
        onChangeText={onChangeText}
        editable={onChangeText != null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  muted: {
    borderColor: colors.mid,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    padding: 0,
  },
  inputMuted: {
    color: colors.mid,
  },
});
