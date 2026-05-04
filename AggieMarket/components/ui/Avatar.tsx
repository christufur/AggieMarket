import { View } from "react-native";
import { Text } from "./text";

const PALETTES = [
  { bg: '#FDE4D3', fg: '#8C3A1A' },
  { bg: '#DEEBFF', fg: '#1A4B8C' },
  { bg: '#E5DCFA', fg: '#4A2E8C' },
  { bg: '#DCF1E4', fg: '#1A6B3A' },
  { bg: '#FBE3EC', fg: '#8C0B42' },
  { bg: '#FFE9C7', fg: '#8C5A0B' },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

export function Avatar({ name = '', size = 40, style }: { name?: string; size?: number; style?: any }) {
  const initials = name.split(/\s+/).map(s => s[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
  const { bg, fg } = PALETTES[hashName(name) % PALETTES.length];
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }, style]}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: fg }}>
        {initials}
      </Text>
    </View>
  );
}
