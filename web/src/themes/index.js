import { createTheme } from '@mui/material/styles';

// assets
import colors from 'assets/scss/_themes-vars.module.scss';

// project imports
import componentStyleOverrides from './compStyleOverride';
import themePalette from './palette';
import themeTypography from './typography';
import { varAlpha, createGradient } from './utils';

// 创建自定义渐变背景色
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
      borderRadius: themeOption?.customization?.borderRadius || 12
    },
    typography: themeTypography(themeOption),
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920
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
    paper: '#211F1C',
    backgroundDefault: '#1A1916',
    background: '#272420',
    darkTextPrimary: '#F2F0EB',
    darkTextSecondary: '#C4BFB5',
    textDark: '#FAF9F5',
    menuSelected: color.primary200,
    menuSelectedBack: varAlpha(color.darkPrimaryMain, 0.15),
    divider: 'rgba(235, 230, 222, 0.12)',
    borderColor: 'rgba(235, 230, 222, 0.15)',
    menuButton: '#2E2B27',
    menuButtonColor: color.darkPrimaryMain,
    menuChip: '#2E2B27',
    headBackgroundColor: '#2E2B27',
    headBackgroundColorHover: varAlpha('#2E2B27', 0.08),
    tableBorderBottom: 'rgba(235, 230, 222, 0.1)'
  };
}

function GetLightOption() {
  const color = colors;
  return {
    mode: 'light',
    heading: '#141413', // 主要文本和图标
    paper: '#FAF9F5', // 主要背景色
    backgroundDefault: '#FAF9F5', // 主要背景色
    background: '#FAF9F5',
    darkTextPrimary: '#141413', // 主要文本和图标
    darkTextSecondary: '#8A847A', // 次要文本颜色
    textDark: '#141413',
    menuSelected: '#E3DCD1', // 已选择
    menuSelectedBack: varAlpha('#E3DCD1', 0.8),
    divider: '#EBE6DE',
    borderColor: '#EBE6DE',
    menuButton: '#141413', // 导航栏背景 (强调色)
    menuButtonColor: '#FAF9F5', // 导航栏内容 (浅色)
    menuChip: '#EBE6DE',
    headBackgroundColor: '#EBE6DE', // 表头背景 (悬停色)
    headBackgroundColorHover: varAlpha('#EBE6DE', 0.08), // 悬停
    tableBorderBottom: '#EBE6DE'
  };
}
