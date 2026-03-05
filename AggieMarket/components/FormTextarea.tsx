import { TextInput, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type FormTextareaProps = {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
};

export function FormTextarea({
  value,
  placeholder = "Describe your item...",
  onChangeText,
}: FormTextareaProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.mid}
      multiline
      numberOfLines={4}
      onChangeText={onChangeText}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.mid,
    height: 70,
    textAlignVertical: "top",
  },
});
