import { View, Pressable } from "react-native";
import { Text } from "./text";
import { colors } from "@/theme/colors";

export type ChipVariant = "solid" | "soft" | "outline" | "success" | "warn" | "ghost" | "free";

const VARIANTS: Record<ChipVariant, { bg: string; border: string; fg: string }> = {
  solid:   { bg: colors.primary,      border: colors.primary,    fg: colors.white },
  soft:    { bg: colors.primaryLight, border: colors.primary200, fg: colors.primaryDark },
  outline: { bg: colors.white,        border: colors.border,     fg: colors.ink },
  success: { bg: colors.successLight, border: '#c8e6c9',         fg: colors.success },
  warn:    { bg: colors.warningLight, border: '#ffe082',         fg: colors.warning },
  ghost:   { bg: 'transparent',       border: 'transparent',     fg: colors.dark },
  free:    { bg: colors.success,      border: colors.success,    fg: colors.white },
};

export function Chip({
  children,
  variant = "outline",
  onPress,
  style,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  onPress?: () => void;
  style?: any;
}) {
  const v = VARIANTS[variant] ?? VARIANTS.outline;
  const inner = (
    <View style={[{
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 999, borderWidth: 1,
      backgroundColor: v.bg, borderColor: v.border,
      alignSelf: 'flex-start',
    }, style]}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: v.fg, lineHeight: 18 }}>
        {children}
      </Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{inner}</Pressable>;
  return inner;
}
