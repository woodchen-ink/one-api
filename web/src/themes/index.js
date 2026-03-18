import { createTheme } from '@mui/material/styles';

// assets
import colors from 'assets/scss/_themes-vars.module.scss';

// project imports
import componentStyleOverrides from './compStyleOverride';
import themePalette from './palette';
import themeTypography from './typography';
import { varAlpha, createGradient } from './utils';

const customGradients = {
  primary: createGradient(colors.primaryMain, colors.primaryDark),
  secondary: createGradient(colors.secondaryMain, colors.secondaryDark)
};

/**
 * Represent theme style and structure as per Material-UI
 * @param {JsonObject} customization customization parameter object
 */
export const theme = (customization) => {
  const color = colors;
  const options = customization.theme === 'light' ? GetLightOption() : GetDarkOption();
  const themeOption = {
    colors: color,
    gradients: customGradients,
    ...options,
    customization
  };

  const themeOptions = {
    direction: 'ltr',
    palette: themePalette(themeOption),
    mixins: {
      toolbar: {
        minHeight: '48px',
        padding: '8px 16px',
        '@media (min-width: 600px)': {
          minHeight: '48px'
        }
      }
    },
    shape: {
      borderRadius: themeOption?.customization?.borderRadius || 8
    },
    typography: themeTypography(themeOption),
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536
      }
    },
    zIndex: {
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500
    }
  };

  const themes = createTheme(themeOptions);
  themes.components = componentStyleOverrides(themeOption);

  return themes;
};

export default theme;

function GetDarkOption() {
  const color = colors;
  return {
    mode: 'dark',
    heading: color.darkTextTitle,
    paper: '#292623',
    backgroundDefault: '#1F1D1B',
    background: '#292623',
    darkTextPrimary: '#CFCAC2',
    darkTextSecondary: '#8F8B85',
    textDark: '#EBE8E1',
    menuSelected: '#36322E',
    menuSelectedBack: '#36322E',
    divider: color.darkDivider,
    borderColor: color.darkDivider,
    menuButton: '#2E2B28',
    menuButtonColor: color.darkPrimaryMain,
    menuChip: '#2E2B28',
    headBackgroundColor: '#2E2B28',
    headBackgroundColorHover: varAlpha('#2E2B28', 0.32),
    tableBorderBottom: color.darkDivider
  };
}

function GetLightOption() {
  return {
    mode: 'light',
    heading: '#2C2825',
    paper: '#FAF8F4',
    backgroundDefault: '#F7F5F0',
    background: '#F7F5F0',
    darkTextPrimary: '#45403B',
    darkTextSecondary: '#857F76',
    textDark: '#2C2825',
    menuSelected: '#E3DCD1',
    menuSelectedBack: '#E3DCD1',
    divider: '#DBD3C8',
    borderColor: '#DBD3C8',
    menuButton: '#141413',
    menuButtonColor: '#F7F5F0',
    menuChip: '#EBE8E1',
    headBackgroundColor: '#EBE8E1',
    headBackgroundColorHover: varAlpha('#EBE8E1', 0.8),
    tableBorderBottom: '#DBD3C8'
  };
}
