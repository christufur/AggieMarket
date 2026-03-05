import { Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type ButtonSecondaryProps = {
  title: string;
  onPress?: () => void;
};

export function ButtonSecondary({ title, onPress }: ButtonSecondaryProps) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
});
