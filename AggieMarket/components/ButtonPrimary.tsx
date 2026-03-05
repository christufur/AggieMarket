import { Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type ButtonPrimaryProps = {
  title: string;
  onPress?: () => void;
};

export function ButtonPrimary({ title, onPress }: ButtonPrimaryProps) {
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
    backgroundColor: colors.ink,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
