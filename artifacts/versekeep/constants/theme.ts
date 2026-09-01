// ─────────────────────────────────────────────────────────
// VerseKeep brand palette — Strong Red / Black / Cream
// Based on uploaded design reference (DBS Bank Rebranding style)
// ─────────────────────────────────────────────────────────

export const T = {
  // ── Brand ──────────────────────────────────────────────
  red:         '#C50022',
  redDark:     '#9B001A',
  redFaint:    'rgba(197,0,34,0.09)',
  redBorder:   'rgba(197,0,34,0.30)',

  // ── Surfaces ───────────────────────────────────────────
  black:       '#0A0A0A',   // Page background
  surface:     '#111111',   // Cards, panels
  surfaceEl:   '#1A1A1A',   // Elevated inputs, toggles

  // ── Borders ────────────────────────────────────────────
  border:      'rgba(255,255,255,0.07)',
  borderMd:    'rgba(255,255,255,0.14)',

  // ── Text ───────────────────────────────────────────────
  cream:       '#F2EDE4',   // Primary text
  creamDim:    '#9A9488',   // Secondary text
  creamMute:   '#3D3A35',   // Placeholder / disabled
  white:       '#FFFFFF',

  // ── Semantic ───────────────────────────────────────────
  success:     '#4A9B6F',
  successFaint:'rgba(74,155,111,0.10)',
  warning:     '#C9921A',
  warningFaint:'rgba(201,146,26,0.10)',
  warningBorder:'rgba(201,146,26,0.30)',
  amberFaint:  'rgba(201,146,26,0.10)',
  amberBorder: 'rgba(201,146,26,0.30)',
} as const;

// ─────────────────────────────────────────────────────────
// Font names — these must match the keys passed to useFonts()
// in app/_layout.tsx and the .ttf filenames in assets/fonts/
// ─────────────────────────────────────────────────────────
export const FONTS = {
  display:      'BebasNeue',           // Headers, ref labels, stats
  serif:        'PlayfairDisplay',     // Verse text (regular)
  serifItalic:  'PlayfairDisplay-Italic', // Verse text (italic)
  body:         'DMSans',              // All UI text (regular)
  bodyMedium:   'DMSans-Medium',       // UI text (medium weight)
  bodyBold:     'DMSans-Bold',         // UI text (bold / buttons)
} as const;

// ─────────────────────────────────────────────────────────
// Spacing scale (use multiples of 4)
// ─────────────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  page: 20, // Standard horizontal page padding
} as const;

// ─────────────────────────────────────────────────────────
// Border radius
// ─────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   2,
  md:   4,
  lg:   8,
  pill: 20,
} as const;
