export const colors = {
  // brand
  primary:       '#8C0B42',
  primaryDark:   '#6B0833',
  primaryLight:  '#FDF2F6',
  primary200:    '#F4D5E0',

  // neutrals
  white:         '#FFFFFF',
  bg:            '#F7F5F0',
  border:        '#E8E4DD',
  /** Slightly darker than border — structural dividers between white panels */
  divider:       '#C9C1B6',
  mid:           '#9C9690',
  dark:          '#5C544D',
  ink:           '#0F0710',

  // semantic
  success:       '#2E7D4F',
  successLight:  '#E8F3EC',
  warning:       '#C77A0B',
  warningLight:  '#FBF1DC',
  danger:        '#B3261E',
  dangerLight:   '#FBE9E7',

  // legacy aliases so existing code doesn't break
  primaryDarkest: '#380418',
  primaryBorder:  '#F4D5E0',
  error:          '#B3261E',
  errorLight:     '#FBE9E7',
} as const;

export type Colors = typeof colors;
export default colors;
