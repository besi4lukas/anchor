/**
 * UI Constants
 * 
 * Centralized constants for UI dimensions, spacing, and styling values.
 * This helps maintain consistency across the app and makes it easier to
 * adjust the design system in one place.
 */

// Animation constants
export const ANIMATION = {
  /** Duration for ring pulse animation in milliseconds */
  RING_PULSE_DURATION: 2200,
  /** Duration for halo pulse animation in milliseconds */
  HALO_PULSE_DURATION: 2800,
  /** Duration for listening animation in milliseconds */
  LISTENING_ANIMATION_DURATION: 900,
} as const;

// AnchorBeam sizing constants
export const NOTE_BEAM = {
  /** Core button size */
  CORE: 60,
  /** Icon size inside the button */
  ICON: 16,
  /** Ring size around the button */
  RING: 65,
  /** Mask size for the button */
  MASK: 50,
  /** Halo size for the outer glow */
  HALO: 78,
  /** Horizontal position from right edge */
  RIGHT: 35,
  /** Gap above tab bar */
  GAP_ABOVE_TAB: 8,
  /** Default tab bar height */
  DEFAULT_TAB_BAR_HEIGHT: 78,
} as const;

// Modal/Sheet constants
export const MODAL = {
  /** Maximum height of modal sheets as percentage of screen */
  MAX_HEIGHT_PERCENT: "80%",
  /** Border radius for modal sheets */
  BORDER_RADIUS: 24,
  /** Background overlay opacity */
  OVERLAY_OPACITY: 0.5,
  /** Overlay background color (black with opacity) */
  OVERLAY_BG: "rgba(0, 0, 0, 0.5)",
} as const;

// Spacing constants
export const SPACING = {
  /** Standard horizontal padding */
  HORIZONTAL: 16,
  /** Standard horizontal padding for modals */
  MODAL_HORIZONTAL: 20,
  /** Standard vertical padding */
  VERTICAL: 12,
  /** Large vertical padding */
  VERTICAL_LARGE: 24,
  /** Standard gap between elements */
  GAP: 8,
  /** Small gap between elements */
  GAP_SMALL: 4,
} as const;

// Text input constants
export const TEXT_INPUT = {
  /** Minimum height for multiline text inputs */
  MIN_HEIGHT: 120,
  /** Standard font size for inputs */
  FONT_SIZE: 18,
  /** Standard font weight for inputs */
  FONT_WEIGHT: "600" as const,
} as const;

// Button constants
export const BUTTON = {
  /** Standard button padding vertical */
  PADDING_VERTICAL: 12,
  /** Standard button padding horizontal */
  PADDING_HORIZONTAL: 20,
  /** Standard button border radius */
  BORDER_RADIUS: 12,
  /** Standard button active opacity */
  ACTIVE_OPACITY: 0.92,
} as const;

// Date picker constants
export const DATE_PICKER = {
  /** Number of weeks to render in scroll view (for smooth scrolling) */
  WEEKS_TO_RENDER: 3,
  /** Days in a week */
  DAYS_IN_WEEK: 7,
  /** Percentage width for each day column */
  DAY_COLUMN_WIDTH: "14.28%", // 100% / 7 days
  /** Date button size */
  DATE_BUTTON_SIZE: 32,
  /** Dot indicator size */
  DOT_SIZE: 3,
} as const;

// Tab bar constants
export const TAB_BAR = {
  /** Standard tab bar height */
  HEIGHT: 90,
  /** Tab bar padding top */
  PADDING_TOP: 8,
  /** Tab bar padding bottom */
  PADDING_BOTTOM: 8,
} as const;

