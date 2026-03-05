import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type PhotoUploadProps = {
  onPress?: () => void;
};

export function PhotoUpload({ onPress }: PhotoUploadProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name="add" size={24} color={colors.mid} />
      </View>
      <Text style={styles.text}>Add photos (up to 8)</Text>
      <Text style={styles.hint}>Tap to upload or take photo</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 110,
    borderWidth: 2,
    borderColor: colors.mid,
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  icon: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: colors.mid,
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 10,
    color: colors.dark,
  },
  hint: {
    fontSize: 9,
    color: colors.mid,
  },
});
