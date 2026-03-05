import { TextInput, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type FormInputProps = {
  value?: string;
  placeholder?: string;
  active?: boolean;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  style?: object;
};

export function FormInput({
  value,
  placeholder,
  active,
  editable = true,
  onChangeText,
  style,
}: FormInputProps) {
  return (
    <TextInput
      style={[
        styles.input,
        active && styles.inputActive,
        !editable && styles.inputMuted,
        style,
      ]}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.mid}
      editable={editable}
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
    color: colors.dark,
  },
  inputActive: {
    borderColor: colors.ink,
    color: colors.ink,
  },
  inputMuted: {
    color: colors.dark,
  },
});
