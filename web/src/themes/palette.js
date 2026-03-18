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
      lighter: theme.mode === 'dark' ? theme.colors?.darkPrimaryLight : theme.colors?.grey100,
      light: theme.mode === 'dark' ? theme.colors?.darkPrimaryLight : theme.colors?.primaryLight,
      main: theme.mode === 'dark' ? theme.colors?.darkPrimaryMain : theme.colors?.primaryMain,
      dark: theme.mode === 'dark' ? theme.colors?.darkPrimaryDark : theme.colors?.primaryDark,
      darker: theme.mode === 'dark' ? theme.colors?.darkPrimary800 : theme.colors?.primary800,
      200: theme.mode === 'dark' ? theme.colors?.darkPrimary200 : theme.colors?.primary200,
      800: theme.mode === 'dark' ? theme.colors?.darkPrimary800 : theme.colors?.primary800,
      contrastText: theme.mode === 'dark' ? '#EEF3F8' : '#F8FAFC',
      gradient: createGradient(theme.colors?.brandStart, theme.colors?.brandEnd)
    },
    secondary: {
      lighter: theme.mode === 'dark' ? theme.colors?.darkSecondaryLight : theme.colors?.secondaryLight,
      light: theme.mode === 'dark' ? theme.colors?.darkSecondaryLight : theme.colors?.secondaryLight,
      main: theme.mode === 'dark' ? theme.colors?.darkSecondaryMain : theme.colors?.secondaryMain,
      dark: theme.mode === 'dark' ? theme.colors?.darkSecondaryDark : theme.colors?.secondaryDark,
      darker: theme.mode === 'dark' ? theme.colors?.darkSecondary800 : theme.colors?.secondary800,
      200: theme.mode === 'dark' ? theme.colors?.darkSecondary200 : theme.colors?.secondary200,
      800: theme.mode === 'dark' ? theme.colors?.darkSecondary800 : theme.colors?.secondary800,
      contrastText: theme.mode === 'dark' ? '#10141C' : '#F8FAFC',
      gradient: createGradient(
        theme.mode === 'dark' ? theme.colors?.darkSecondaryMain : theme.colors?.secondaryMain,
        theme.mode === 'dark' ? theme.colors?.darkSecondaryDark : theme.colors?.secondaryDark
      )
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
      contrastText: theme.mode === 'dark' ? '#EEF3F8' : '#F8FAFC'
    },
    warning: {
      lighter: theme.colors?.warningLight,
      light: theme.colors?.warningLight,
      main: theme.colors?.warningMain,
      dark: theme.colors?.warningDark,
      contrastText: '#F8FAFC',
      gradient: createGradient(theme.colors?.warningMain, theme.colors?.warningDark)
    },
    success: {
      lighter: theme.colors?.successLight,
      light: theme.colors?.successLight,
      200: theme.colors?.success200,
      main: theme.colors?.successMain,
      dark: theme.colors?.successDark,
      contrastText: '#F8FAFC',
      gradient: createGradient(theme.colors?.successMain, theme.colors?.successDark)
    },
    info: {
      lighter: theme.colors?.infoLight,
      light: theme.colors?.infoLight,
      main: theme.colors?.infoMain,
      dark: theme.colors?.infoDark,
      contrastText: theme.mode === 'dark' ? '#10141C' : '#F8FAFC'
    },
    grey: {
      50: theme.colors?.grey50,
      100: theme.colors?.grey100,
      200: theme.colors?.grey200,
      300: theme.colors?.grey300,
      400: theme.colors?.grey400 || '#BDC6D3',
      500: theme.colors?.grey500,
      600: theme.colors?.grey600,
      700: theme.colors?.grey700,
      800: theme.colors?.grey800 || '#2A313A',
      900: theme.colors?.grey900 || '#10131A'
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
      neutral: theme.mode === 'dark' ? theme.colors?.darkLevel1 : theme.colors?.grey200
    },
    action: {
      hover: theme.mode === 'dark' ? varAlpha(theme.headBackgroundColor, 0.9) : varAlpha(theme.colors?.grey200, 0.92),
      selected: theme.mode === 'dark' ? varAlpha(theme.menuSelectedBack, 0.92) : varAlpha(theme.menuSelected, 0.92),
      disabled: varAlpha(theme.colors?.grey500, 0.8),
      disabledBackground: varAlpha(theme.colors?.grey500, 0.24),
      focus: varAlpha(theme.colors?.grey500, 0.24),
      active: theme.mode === 'dark' ? theme.colors?.grey500 : theme.colors?.grey600
    }
  };
}
