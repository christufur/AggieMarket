import { Ionicons } from "@expo/vector-icons";

const ICON_MAP: Record<string, string> = {
  search:       'search-outline',
  sliders:      'options-outline',
  bell:         'notifications-outline',
  chat:         'chatbubble-outline',
  heart:        'heart-outline',
  'heart-fill': 'heart',
  plus:         'add',
  close:        'close',
  check:        'checkmark',
  'arrow-l':    'arrow-back',
  'arrow-r':    'arrow-forward',
  'arrow-up':   'arrow-up',
  'arrow-down': 'arrow-down',
  pin:          'location-outline',
  calendar:     'calendar-outline',
  clock:        'time-outline',
  tag:          'pricetag-outline',
  sparkles:     'sparkles-outline',
  flame:        'flame-outline',
  leaf:         'leaf-outline',
  shield:       'shield-checkmark-outline',
  star:         'star-outline',
  'star-fill':  'star',
  send:         'send-outline',
  image:        'image-outline',
  user:         'person-outline',
  home:         'home-outline',
  compass:      'compass-outline',
  grid:         'grid-outline',
  list:         'list-outline',
  eye:          'eye-outline',
  dollar:       'cash-outline',
  menu:         'menu-outline',
  filter:       'funnel-outline',
};

export function Icon({
  name,
  size = 16,
  color = '#0F0710',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const mapped = (ICON_MAP[name] ?? 'help-outline') as any;
  return <Ionicons name={mapped} size={size} color={color} />;
}
