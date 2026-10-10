import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  forest: '#1F5135',
  forestDark: '#163B27',
  chalkboard: '#2E4A3B',
  chalk: '#F4F1E8',
  cream: '#FBF2D5',
  creamDark: '#EFE2B8',
  creamBorder: '#B9AC86',
  paper: '#FFFFFF',
  gridLine: '#E4E7EB',
  gridLineStrong: '#D3D8DE',
  ink: '#151515',
  inkSoft: '#3B3B3B',
  muted: '#6B7280',
  blue: '#1E3FAE',
  blueSoft: '#E1E8FF',
  red: '#C0392B',
  redSoft: '#FDE4E1',
  green: '#2E8B57',
  greenSoft: '#DDF3E5',
  gold: '#E5A823',
  goldSoft: '#FFF2C8',
  overlay: 'rgba(16, 32, 24, 0.55)',
} as const;

export const fonts = {
  hand: 'PatrickHand_400Regular',
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const GRID_SPACING = 22;

export function softShadow(elevation = 4): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.12 + elevation * 0.01,
      shadowRadius: elevation * 1.5,
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
    },
  })!;
}

/** Minimum comfortable touch target (Android guideline: 48dp). */
export const MIN_TOUCH = 48;
