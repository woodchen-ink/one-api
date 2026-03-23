import { createTheme } from '@mui/material/styles';

// assets
import colors from 'assets/scss/_themes-vars.module.scss';

// project imports
import componentStyleOverrides from './compStyleOverride';
import themePalette from './palette';
import themeTypography from './typography';
import { varAlpha, createGradient } from './utils';

const customGradients = {
  primary: createGradient(colors.brandStart, colors.brandEnd),
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
      borderRadius: themeOption?.customization?.borderRadius || 6
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
    paper: color.darkPaper,
    backgroundDefault: color.darkBackground,
    background: color.darkPaper,
    darkTextPrimary: color.darkTextPrimary,
    darkTextSecondary: color.darkTextSecondary,
    textDark: color.darkTextTitle,
    menuSelected: color.darkSelectedBack,
    menuSelectedBack: color.darkSelectedBack,
    divider: color.darkDivider,
    borderColor: color.darkDivider,
    menuButton: color.darkLevel1,
    menuButtonColor: color.darkSecondaryMain,
    menuChip: color.darkLevel1,
    headBackgroundColor: color.darkTableHeader,
    headBackgroundColorHover: varAlpha(color.darkTableHeader, 0.32),
    tableBorderBottom: color.darkDivider
  };
}

function GetLightOption() {
  const color = colors;
  return {
    mode: 'light',
    heading: color.grey900,
    paper: color.paper,
    backgroundDefault: '#F6F7F8',
    background: '#F6F7F8',
    darkTextPrimary: color.grey800,
    darkTextSecondary: color.grey600,
    textDark: color.grey900,
    menuSelected: color.grey300,
    menuSelectedBack: color.grey300,
    divider: color.tableBorderBottom,
    borderColor: color.tableBorderBottom,
    menuButton: color.primaryMain,
    menuButtonColor: color.paper,
    menuChip: color.grey50,
    headBackgroundColor: color.grey100,
    headBackgroundColorHover: varAlpha(color.grey200, 0.8),
    tableBorderBottom: color.tableBorderBottom
  };
}
