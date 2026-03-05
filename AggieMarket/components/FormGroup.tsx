import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type FormGroupProps = {
  label: string;
  children: React.ReactNode;
};

export function FormGroup({ label, children }: FormGroupProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
});
