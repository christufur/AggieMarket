import { View } from "react-native";
import { Text } from "./text";
import { colors } from "@/theme/colors";

export function Logo({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 14 : size === 'md' ? 10 : 7;
  const py = size === 'lg' ? 8  : size === 'md' ? 5  : 3;
  const fs = size === 'lg' ? 16 : size === 'md' ? 13 : 11;
  return (
    <View style={{ backgroundColor: colors.primary, paddingHorizontal: px, paddingVertical: py, borderRadius: 6 }}>
      <Text style={{ color: colors.white, fontSize: fs, fontWeight: '800', letterSpacing: 0.6 }}>
        AM
      </Text>
    </View>
  );
}
