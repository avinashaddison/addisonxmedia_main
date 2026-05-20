/**
 * ThemeToggle — currently DISABLED.
 *
 * Why: the app uses brand poster colors (cream, saffron, ochre, magenta)
 * hardcoded in ~500 places across the wizard, admin, and inbox surfaces.
 * Toggling to dark mode flips the CSS variables but those hardcoded hex
 * values don't budge, producing a half-light/half-dark UI that looks
 * worse than light alone.
 *
 * The full dark-mode CSS palette is still defined in index.css under
 * `.dark { ... }`, so re-enabling once a proper dark theme is designed
 * is a one-line change: restore the buttons + add the dark: variant to
 * every brand color call site (a 2-3 day refactor).
 *
 * Until then we render nothing so users don't see a broken state.
 */
type Props = {
  collapsed?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ThemeToggle = (_props: Props) => null;
