/**
 * Color intention that you want to used in your theme
 * @param {JsonObject} theme Theme customization object
 */

import { varAlpha, createGradient } from './utils';

export default function themePalette(theme) {
  return {
    mode: theme.mode,
    common: {
      black: '#000000',
      white: '#FFFFFF'
    },
    primary: {
      lighter: theme.mode === 'dark' ? '#EFD6C1' : theme.colors?.grey100,
      light: theme.colors?.primaryLight,
      main: theme.colors?.primaryMain,
      dark: theme.colors?.primaryDark,
      darker: theme.colors?.primary800,
      200: theme.colors?.primary200,
      800: theme.colors?.primary800,
      contrastText: theme.mode === 'dark' ? '#1F1D1B' : '#F7F5F0',
      gradient: createGradient(theme.colors?.primaryMain, theme.colors?.primaryDark)
    },
    secondary: {
      lighter: theme.mode === 'dark' ? '#8C7F73' : theme.colors?.secondaryLight,
      light: theme.colors?.secondaryLight,
      main: theme.colors?.secondaryMain,
      dark: theme.colors?.secondaryDark,
      darker: theme.colors?.secondary800,
      200: theme.colors?.secondary200,
      800: theme.colors?.secondary800,
      contrastText: theme.mode === 'dark' ? '#EBE8E1' : '#FAF8F4',
      gradient: createGradient(theme.colors?.secondaryMain, theme.colors?.secondaryDark)
    },
    error: {
      lighter: theme.colors?.errorLight,
      light: theme.colors?.errorLight,
      main: theme.colors?.errorMain,
      dark: theme.colors?.errorDark,
      contrastText: '#FAF8F4',
      gradient: createGradient(theme.colors?.errorMain, theme.colors?.errorDark)
    },
    orange: {
      lighter: theme.colors?.orangeLight,
      light: theme.colors?.orangeLight,
      main: theme.colors?.orangeMain,
      dark: theme.colors?.orangeDark,
      contrastText: theme.mode === 'dark' ? '#EBE8E1' : '#2C2825'
    },
    warning: {
      lighter: theme.colors?.warningLight,
      light: theme.colors?.warningLight,
      main: theme.colors?.warningMain,
      dark: theme.colors?.warningDark,
      contrastText: '#141413',
      gradient: createGradient(theme.colors?.warningMain, theme.colors?.warningDark)
    },
    success: {
      lighter: theme.colors?.successLight,
      light: theme.colors?.successLight,
      200: theme.colors?.success200,
      main: theme.colors?.successMain,
      dark: theme.colors?.successDark,
      contrastText: '#FAF8F4',
      gradient: createGradient(theme.colors?.successMain, theme.colors?.successDark)
    },
    info: {
      lighter: theme.colors?.infoLight,
      light: theme.colors?.infoLight,
      main: theme.colors?.infoMain,
      dark: theme.colors?.infoDark,
      contrastText: theme.mode === 'dark' ? '#EBE8E1' : '#2C2825'
    },
    grey: {
      50: theme.colors?.grey50,
      100: theme.colors?.grey100,
      200: theme.colors?.grey200,
      300: theme.colors?.grey300,
      400: theme.colors?.grey400 || '#C4C2BF',
      500: theme.colors?.grey500,
      600: theme.colors?.grey600,
      700: theme.colors?.grey700,
      800: theme.colors?.grey800 || '#2A2928',
      900: theme.colors?.grey900 || '#141413'
    },
    dark: {
      light: theme.colors?.darkTextPrimary,
      main: theme.colors?.darkLevel1,
      dark: theme.colors?.darkLevel2,
      800: theme.colors?.darkBackground,
      900: theme.colors?.darkPaper
    },
    text: {
      primary: theme.darkTextPrimary,
      secondary: theme.darkTextSecondary,
      dark: theme.textDark,
      hint: theme.colors?.grey100,
      disabled: theme.mode === 'dark' ? theme.colors?.grey600 : theme.colors?.grey500
    },
    divider: theme.divider || (theme.mode === 'dark' ? varAlpha(theme.colors?.grey500, 0.28) : varAlpha(theme.colors?.grey500, 0.32)),
    background: {
      paper: theme.paper,
      default: theme.backgroundDefault,
      neutral: theme.mode === 'dark' ? '#2E2B28' : theme.colors?.grey200
    },
    action: {
      hover: theme.mode === 'dark' ? varAlpha('#2E2B28', 0.88) : varAlpha('#EBE6DE', 0.9),
      selected: theme.mode === 'dark' ? varAlpha('#36322E', 0.92) : varAlpha('#E3DCD1', 0.92),
      disabled: varAlpha(theme.colors?.grey500, 0.8),
      disabledBackground: varAlpha(theme.colors?.grey500, 0.24),
      focus: varAlpha(theme.colors?.grey500, 0.24),
      active: theme.mode === 'dark' ? theme.colors?.grey500 : theme.colors?.grey600
    }
  };
}
