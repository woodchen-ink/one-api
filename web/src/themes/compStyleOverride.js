import { varAlpha } from './utils';

export default function componentStyleOverrides(theme) {
  const isDark = theme.mode === 'dark';

  return {
    MuiCssBaseline: {
      styleOverrides: `
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', system-ui, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        :root {
          --czl-foreground: ${theme.mode === 'dark' ? '#EEF3F8' : '#10131A'};
          --czl-background: ${theme.mode === 'dark' ? '#10141C' : '#F6F7F8'};
          --czl-primary: ${theme.mode === 'dark' ? '#2A367A' : '#1B2152'};
          --czl-accent: ${theme.mode === 'dark' ? '#7B90BF' : '#4B669A'};
          --czl-destructive: ${theme.mode === 'dark' ? '#C08998' : '#9D6877'};
          --czl-success: ${theme.mode === 'dark' ? '#7E9FA1' : '#5E7E80'};
          --czl-highlight: ${theme.mode === 'dark' ? '#2B3B57' : '#D9E6F5'};
          --czl-brand-start: #1D2088;
          --czl-brand-end: #2EA7E0;
        }
        html, body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        body, #root, #root__layout {
          display: flex;
          flex: 1 1 auto;
          min-height: 100%;
          flex-direction: column;
        }
        body {
          color: var(--czl-foreground);
          background-color: var(--czl-background);
          background-image: none;
        }
        img {
          max-width: 100%;
          vertical-align: middle;
        }
        ul {
          margin: 0;
          padding: 0;
          list-style-type: none;
        }
        input[type='number'] {
          -moz-appearance: textfield;
          appearance: none;
        }
        input[type='number']::-webkit-outer-spin-button,
        input[type='number']::-webkit-inner-spin-button {
          margin: 0;
          -webkit-appearance: none;
        }
        .apexcharts-title-text {
          fill: ${theme.textDark} !important
        }
        .apexcharts-text {
          fill: ${theme.textDark} !important
        }
        .apexcharts-legend-text {
          color: ${theme.textDark} !important
        }
        .apexcharts-menu {
          background: ${theme.backgroundDefault} !important
        }
        .apexcharts-gridline, .apexcharts-xaxistooltip-background, .apexcharts-yaxistooltip-background {
          stroke: ${theme.divider} !important;
        }
      `
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, sans-serif'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        color: 'inherit',
        disableElevation: true
      },
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: '8px',
          textTransform: 'unset',
          boxShadow: 'none',
          '&.Mui-disabled': {
            color: theme.colors?.grey500
          },
          '&:hover': {
            boxShadow: 'none'
          }
        },
        contained: {
          color: isDark ? '#EEF3F8' : '#F8FAFC',
          backgroundColor: isDark ? theme.colors?.darkPrimaryMain : theme.colors?.primaryMain,
          '&:hover': {
            backgroundColor: isDark ? theme.colors?.darkPrimaryDark : theme.colors?.primaryDark
          }
        },
        containedPrimary: {
          background: isDark ? theme.colors?.darkPrimaryMain : theme.colors?.primaryMain,
          color: isDark ? '#EEF3F8' : '#F8FAFC',
          '&:hover': {
            background: isDark ? theme.colors?.darkPrimaryDark : theme.colors?.primaryDark
          }
        },
        containedSecondary: {
          background: isDark ? theme.colors?.darkSecondaryMain : theme.colors?.secondaryMain,
          color: isDark ? '#10141C' : '#F8FAFC',
          '&:hover': {
            background: isDark ? theme.colors?.darkSecondaryDark : theme.colors?.secondaryDark
          }
        },
        outlinedPrimary: {
          borderColor: varAlpha(theme.colors?.secondaryMain, 0.52),
          color: theme.colors?.secondaryMain,
          '&:hover': {
            backgroundColor: isDark ? varAlpha(theme.colors?.darkLevel1, 0.8) : varAlpha(theme.colors?.grey300, 0.8),
            borderColor: theme.colors?.secondaryMain,
            color: isDark ? theme.colors?.darkPrimaryMain : theme.colors?.secondaryDark
          }
        },
        text: {
          color: theme.textDark,
          '&:hover': {
            backgroundColor: isDark ? varAlpha(theme.colors?.darkLevel1, 0.7) : varAlpha(theme.colors?.grey200, 0.9)
          }
        },
        sizeSmall: {
          height: 34,
          fontSize: '0.8125rem',
          paddingLeft: '12px',
          paddingRight: '12px'
        },
        sizeMedium: {
          paddingLeft: '12px',
          paddingRight: '12px'
        },
        sizeLarge: {
          height: 48,
          paddingLeft: '16px',
          paddingRight: '16px'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px',
          color: theme.darkTextPrimary,
          '&:hover': {
            backgroundColor: theme.headBackgroundColorHover
          }
        },
        sizeSmall: {
          padding: '4px'
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: theme.paper,
          border: `1px solid ${theme.divider}`,
          borderRadius: `${theme?.customization?.borderRadius || 8}px`,
          boxShadow: isDark ? '0 10px 26px rgba(0, 0, 0, 0.28)' : '0 10px 28px rgba(16, 19, 26, 0.08)'
        },
        rounded: {
          borderRadius: `${theme?.customization?.borderRadius || 8}px`
        },
        elevation1: {
          boxShadow: 'none'
        },
        elevation2: {
          boxShadow: 'none'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          borderRadius: `${theme?.customization?.borderRadius || 8}px`,
          padding: 0,
          boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.28)' : '0 12px 30px rgba(16, 19, 26, 0.08)',
          transition: 'box-shadow 0.3s ease',
          backgroundColor: theme.paper,
          border: `1px solid ${theme.divider}`,
          overflow: 'hidden',
          '&:hover': {
            boxShadow: isDark ? '0 16px 34px rgba(0, 0, 0, 0.34)' : '0 16px 36px rgba(16, 19, 26, 0.12)'
          },
          '& .MuiTableContainer-root': {
            borderRadius: 0
          }
        }
      }
    },
    MuiCardHeader: {
      defaultProps: {
        titleTypographyProps: { variant: 'h6' },
        subheaderTypographyProps: { variant: 'body2', marginTop: '4px' }
      },
      styleOverrides: {
        root: {
          padding: '24px 24px 0'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px'
          },
          '& .MuiTableContainer-root': {
            margin: '-24px',
            width: 'calc(100% + 48px)',
            maxWidth: 'calc(100% + 48px)'
          }
        }
      }
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '16px 20px'
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          boxShadow: 'none',
          borderRadius: '8px',
          color: theme.darkTextPrimary,
          border: `1px solid ${theme.divider}`
        },
        listbox: {
          padding: '4px 0'
        },
        option: {
          fontSize: '0.875rem',
          fontWeight: 400,
          lineHeight: '1.43',
          padding: '6px 8px',
          borderRadius: `${(theme?.customization?.borderRadius || 8) * 0.75}px`,
          '&:not(:last-of-type)': {
            marginBottom: 4
          },
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
          },
          '&[aria-selected="true"]': {
            fontWeight: 600,
            backgroundColor: varAlpha(theme.colors?.grey500, 0.16),
            '&:hover': {
              backgroundColor: varAlpha(theme.colors?.grey500, 0.08)
            }
          }
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: theme.darkTextPrimary,
          borderRadius: '8px',
          padding: '8px 16px',
          '&.Mui-selected': {
            color: theme.textDark,
            backgroundColor: theme.menuSelected,
            '&:hover': {
              backgroundColor: theme.menuSelected
            },
            '& .MuiListItemIcon-root': {
              color: theme.textDark
            }
          },
          '&:hover': {
            backgroundColor: theme.headBackgroundColor,
            color: theme.textDark,
            '& .MuiListItemIcon-root': {
              color: theme.textDark
            }
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: theme.mode === 'dark' ? theme.darkTextPrimary : theme.colors?.secondaryMain,
          minWidth: '36px'
        }
      }
    },
    MuiListItemText: {
      defaultProps: {
        primaryTypographyProps: { typography: 'subtitle2' }
      },
      styleOverrides: {
        root: {
          margin: 0
        },
        primary: {
          color: theme.textDark,
          fontSize: '0.875rem'
        },
        secondary: {
          fontSize: '0.75rem',
          color: theme.darkTextSecondary
        },
        multiline: {
          margin: 0
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          lineHeight: '1.5',
          '&.Mui-disabled': {
            '& svg': {
              color: theme.colors?.grey500
            }
          },
          '& .MuiInputBase-input:focus': {
            borderRadius: 'inherit'
          }
        },
        input: {
          color: theme.textDark,
          fontSize: '0.9375rem',
          '&::placeholder': {
            opacity: 1,
            color: theme.colors?.grey500
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: `${theme?.customization?.borderRadius || 8}px`,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: varAlpha(theme.colors?.grey500, 0.2),
            borderWidth: '1px',
            transition: 'border-color 0.2s ease-in-out'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.colors?.secondaryMain,
            borderWidth: '1px'
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? theme.colors?.darkSecondaryMain : theme.colors?.primaryMain,
              borderWidth: '2px'
            }
          },
          '&.Mui-error': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.colors?.errorMain
            }
          },
          '&.Mui-disabled': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: varAlpha(theme.colors?.grey500, 0.24)
            }
          },
          '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0
          },
          '& input[type=number]': {
            MozAppearance: 'textfield'
          }
        },
        input: {
          padding: '14px 16px',
          height: 'auto',
          fontSize: '0.9375rem'
        },
        inputMultiline: {
          padding: '4px 8px'
        },
        sizeSmall: {
          '& input': {
            padding: '10px 14px'
          }
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: theme.colors?.grey500,
          '&.MuiInputLabel-shrink': {
            fontSize: '1rem',
            fontWeight: 600,
            color: theme.darkTextSecondary,
            '&.Mui-focused': {
              color: isDark ? theme.colors?.darkSecondaryMain : theme.colors?.primaryMain
            },
            '&.Mui-error': {
              color: theme.colors?.errorMain
            },
            '&.Mui-disabled': {
              color: theme.colors?.grey500
            }
          }
        }
      }
    },
    MuiFormHelperText: {
      defaultProps: {
        component: 'div'
      },
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          marginLeft: '4px',
          marginTop: '8px'
        }
      }
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.875rem'
        }
      }
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          width: 'auto',
          '& .MuiIconButton-root': {
            padding: 0,
            width: '20px',
            height: '20px',
            minWidth: '20px',
            margin: 0
          },
          '& .MuiSvgIcon-root, & .iconify': {
            fontSize: '16px',
            width: '16px',
            height: '16px'
          }
        },
        positionEnd: {
          marginLeft: 0,
          paddingLeft: 0
        }
      }
    },
    MuiSlider: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          height: 6,
          '&.Mui-disabled': {
            color: varAlpha(theme.colors?.grey500, 0.48)
          }
        },
        rail: {
          opacity: 0.12,
          height: 6,
          backgroundColor: theme.colors?.grey500
        },
        track: {
          height: 6
        },
        mark: {
          width: 1,
          height: 4,
          backgroundColor: varAlpha(theme.colors?.grey500, 0.48)
        },
        valueLabel: {
          borderRadius: 8,
          backgroundColor: isDark ? theme.colors?.grey700 : theme.colors?.grey800
        },
        thumb: {
          width: 16,
          height: 16,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: varAlpha(theme.colors?.grey500, 0.08),
          backgroundColor: '#FAF8F4'
        },
        sizeSmall: {
          '& .MuiSlider-thumb': {
            width: 16,
            height: 16
          },
          '& .MuiSlider-rail': { height: 6 },
          '& .MuiSlider-track': { height: 6 },
          '& .MuiSlider-mark': { height: 4 }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.divider,
          opacity: 1
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 600
        },
        rounded: {
          borderRadius: `${theme?.customization?.borderRadius || 8}px`
        },
        colorDefault: {
          color: theme.darkTextSecondary,
          backgroundColor: varAlpha(theme.colors?.grey500, 0.24)
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          fontWeight: 500,
          height: '32px',
          borderRadius: '16px',
          backgroundColor: theme.mode === 'dark' ? theme.colors?.darkPrimaryMain : theme.colors?.secondaryMain,
          color: theme.mode === 'dark' ? '#EEF3F8' : '#F8FAFC',
          transition: 'all 0.2s ease-in-out',
          '&.MuiChip-outlined': {
            borderColor: theme.mode === 'dark' ? varAlpha(theme.colors?.darkPrimaryMain, 0.8) : theme.colors?.secondaryMain,
            backgroundColor: 'transparent',
            color: theme.mode === 'dark' ? theme.darkTextPrimary : theme.colors?.secondaryMain
          },
          '&.MuiChip-clickable': {
            '&:hover': {
              backgroundColor: theme.mode === 'dark' ? theme.colors?.darkPrimaryDark : theme.colors?.secondaryDark
            }
          }
        },
        label: {
          fontWeight: 500
        },
        icon: {
          color: 'currentColor'
        },
        deleteIcon: {
          opacity: 0.48,
          color: 'currentColor',
          '&:hover': {
            opacity: 1,
            color: 'currentColor'
          }
        },
        sizeMedium: {
          borderRadius: `${(theme?.customization?.borderRadius || 8) * 1.25}px`
        },
        sizeSmall: {
          height: '26px',
          fontSize: '0.75rem',
          backgroundColor: theme.mode === 'dark' ? varAlpha(theme.colors?.darkSecondaryMain, 0.9) : theme.colors?.errorMain,
          color: theme.mode === 'dark' ? '#10141C' : '#F8FAFC',
          '& .MuiChip-label': {
            padding: '0 10px',
            lineHeight: '26px'
          },
          '& .MuiChip-icon': {
            fontSize: '1rem'
          },
          '& .MuiChip-deleteIcon': {
            fontSize: '1rem'
          }
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          position: 'relative',
          scrollbarWidth: 'thin',
          overflowX: 'auto !important',
          overflowY: 'auto !important',
          maxHeight: 'min(62vh, calc(100vh - 300px)) !important',
          minHeight: '240px',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
          borderRadius: `${theme?.customization?.borderRadius || 8}px`,
          boxShadow: 'none'
        }
      }
    },
    MuiTable: {
      defaultProps: {
        stickyHeader: true
      },
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
          width: '100%',
          margin: 0,
          padding: 0
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? theme.headBackgroundColor : theme.colors?.grey200,
          width: '100%',
          margin: 0,
          '& tr': {
            width: '100%',
            '& th:first-of-type': {
              borderTopLeftRadius: 0
            },
            '& th:last-of-type': {
              borderTopRightRadius: 0
            }
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomStyle: 'dashed',
          borderBottomColor: theme.divider,
          fontSize: '0.875rem',
          padding: '16px 12px',
          textAlign: 'center',
          '&:first-of-type': {
            paddingLeft: '12px'
          },
          '&:last-of-type': {
            paddingRight: '12px'
          }
        },
        head: {
          fontSize: 14,
          fontWeight: 600,
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          borderBottom: 'none',
          whiteSpace: 'nowrap',
          padding: '14px 12px',
          textAlign: 'center',
          '&.MuiTableCell-stickyHeader': {
            zIndex: 2,
            backgroundColor: isDark ? theme.headBackgroundColor : theme.colors?.grey200
          }
        },
        body: {
          color: theme.textDark
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
          '&.Mui-selected': {
            backgroundColor: varAlpha(theme.colors?.primaryDark, 0.04),
            '&:hover': {
              backgroundColor: varAlpha(theme.colors?.primaryDark, 0.08)
            }
          },
          '&:last-of-type': {
            '& .MuiTableCell-root': {
              borderColor: 'transparent'
            }
          }
        }
      }
    },
    MuiTablePagination: {
      defaultProps: {
        backIconButtonProps: { size: 'small' },
        nextIconButtonProps: { size: 'small' }
      },
      styleOverrides: {
        root: {
          color: theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          borderTop: `1px dashed ${theme.tableBorderBottom}`,
          overflow: 'auto',
          minHeight: '56px',
          width: '100%',
          margin: 0,
          padding: '0 24px',
          '& .MuiToolbar-root': {
            minHeight: '56px',
            padding: '0',
            ...(theme.breakpoints && {
              [theme.breakpoints.down('sm')]: {
                flexWrap: 'wrap',
                justifyContent: 'center',
                padding: '8px 0'
              }
            }),
            '& > p:first-of-type': {
              fontSize: '0.875rem',
              color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
            }
          }
        },
        select: {
          paddingTop: '6px',
          paddingBottom: '6px',
          paddingLeft: '12px',
          paddingRight: '28px',
          borderRadius: '8px',
          backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          color: theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          '&:focus': {
            borderRadius: `${theme?.customization?.borderRadius || 8}px`
          }
        },
        selectLabel: {
          paddingLeft: '20px',
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
        },
        selectIcon: {
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          right: '6px'
        },
        actions: {
          padding: '0 30px',
          marginLeft: '16px',
          ...(theme.breakpoints && {
            [theme.breakpoints.down('sm')]: {
              marginLeft: '0',
              marginTop: '8px'
            }
          }),
          '& .MuiIconButton-root': {
            padding: '8px',
            backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            borderRadius: '8px',
            color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
            margin: '0 4px',
            '&:hover': {
              backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.05)'
            },
            '&.Mui-disabled': {
              color: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
              backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'
            }
          }
        },
        displayedRows: {
          fontSize: '0.875rem',
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          margin: 0,
          ...(theme.breakpoints && {
            [theme.breakpoints.down('sm')]: {
              margin: '8px 0'
            }
          })
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? theme.colors?.grey700 : theme.colors?.grey800,
          borderRadius: '6px',
          fontWeight: 400,
          fontSize: '0.75rem',
          padding: '6px 10px',
          boxShadow: 'none'
        },
        arrow: {
          color: isDark ? theme.colors?.grey700 : theme.colors?.grey800
        },
        popper: {
          '&[data-popper-placement*="bottom"] .MuiTooltip-tooltip': {
            marginTop: 12
          },
          '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
            marginBottom: 12
          },
          '&[data-popper-placement*="right"] .MuiTooltip-tooltip': {
            marginLeft: 12
          },
          '&[data-popper-placement*="left"] .MuiTooltip-tooltip': {
            marginRight: 12
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          borderRadius: '8px',
          alignItems: 'center',
          padding: '12px 16px'
        },
        icon: {
          opacity: 1
        },
        standardSuccess: {
          backgroundColor: theme.mode === 'dark' ? varAlpha(theme.colors?.successMain, 0.2) : theme.colors?.successLight,
          color: theme.mode === 'dark' ? '#DCE7E7' : theme.colors?.successDark,
          '& .MuiAlert-icon': {
            color: theme.mode === 'dark' ? theme.colors?.successMain : theme.colors?.successMain
          }
        },
        standardError: {
          backgroundColor: theme.mode === 'dark' ? varAlpha(theme.colors?.errorMain, 0.22) : theme.colors?.errorLight,
          color: theme.mode === 'dark' ? '#F1D7DE' : theme.colors?.errorDark,
          '& .MuiAlert-icon': {
            color: theme.mode === 'dark' ? theme.colors?.errorMain : theme.colors?.errorMain
          }
        },
        standardWarning: {
          backgroundColor: theme.mode === 'dark' ? varAlpha(theme.colors?.warningMain, 0.2) : theme.colors?.warningLight,
          color: theme.mode === 'dark' ? '#DDE4F3' : theme.colors?.warningDark,
          '& .MuiAlert-icon': {
            color: theme.mode === 'dark' ? theme.colors?.warningMain : theme.colors?.warningMain
          }
        },
        standardInfo: {
          backgroundColor:
            theme.mode === 'dark' ? varAlpha(theme.colors?.darkSecondaryMain, 0.16) : varAlpha(theme.colors?.secondaryMain, 0.1),
          color: theme.mode === 'dark' ? '#E4EAF3' : theme.colors?.primaryDark,
          '& .MuiAlert-icon': {
            color: theme.mode === 'dark' ? theme.colors?.darkSecondaryMain : theme.colors?.secondaryMain
          }
        }
      }
    },
    MuiTabs: {
      defaultProps: {
        textColor: 'inherit',
        variant: 'scrollable',
        allowScrollButtonsMobile: true
      },
      styleOverrides: {
        flexContainer: {
          gap: '24px',
          '@media (min-width:600px)': {
            gap: '40px'
          }
        },
        indicator: {
          backgroundColor: 'currentColor'
        }
      }
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
        iconPosition: 'start'
      },
      styleOverrides: {
        root: {
          opacity: 1,
          minWidth: 48,
          minHeight: 48,
          padding: '8px 0',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: theme.darkTextSecondary,
          '&.Mui-selected': {
            color: theme.darkTextPrimary,
            fontWeight: 600
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: `${(theme?.customization?.borderRadius || 8) + 2}px`,
          boxShadow: 'none',
          overflow: 'visible',
          border: `1px solid ${theme.divider}`,
          '&.MuiPaper-rounded': {
            borderRadius: `${(theme?.customization?.borderRadius || 8) + 2}px`
          }
        },
        paperFullScreen: {
          borderRadius: 0
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
          padding: '24px',
          color: theme.textDark
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '0 24px',
          fontSize: '0.9375rem',
          color: theme.darkTextPrimary
        },
        dividers: {
          borderTop: 0,
          borderBottomStyle: 'dashed',
          paddingBottom: '24px'
        }
      }
    },
    MuiDialogActions: {
      defaultProps: {
        disableSpacing: true
      },
      styleOverrides: {
        root: {
          padding: '24px',
          '& > :not(:first-of-type)': {
            marginLeft: '12px'
          }
        }
      }
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover'
      },
      styleOverrides: {
        root: {
          color: theme.colors?.primaryMain
        }
      }
    },
    MuiBadge: {
      styleOverrides: {
        dot: {
          borderRadius: '50%'
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          right: 10,
          width: 18,
          height: 18,
          top: 'calc(50% - 9px)',
          color: theme.darkTextSecondary,
          transition: 'transform 0.2s ease-in-out'
        },
        iconOpen: {
          transform: 'rotate(180deg)'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '6px 8px',
          borderRadius: `${(theme?.customization?.borderRadius || 8) * 0.75}px`,
          '&:not(:last-of-type)': {
            marginBottom: 4
          },
          '&.Mui-selected': {
            backgroundColor: theme.mode === 'dark' ? varAlpha(theme.menuSelectedBack, 0.72) : varAlpha(theme.menuSelected, 0.72),
            '&.Mui-focusVisible': {
              backgroundColor: theme.mode === 'dark' ? varAlpha(theme.menuSelectedBack, 0.94) : varAlpha(theme.menuSelected, 0.94)
            }
          }
        }
      }
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          borderRadius: 0,
          backgroundColor: theme.paper,
          overflow: 'hidden',
          width: '100%',
          margin: 0,
          padding: 0,
          scrollbarWidth: 'thin',
          '& .MuiPaper-root': {
            borderRadius: 0
          },
          '&.MuiPaper-root': {
            borderRadius: 0
          },
          '& .MuiDataGrid-main': {
            width: '100%',
            margin: 0,
            padding: 0,
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: `1px dashed ${theme.divider}`,
              borderRadius: 0,
              backgroundColor: isDark ? theme.headBackgroundColor : theme.colors?.grey200,
              minHeight: '48px',
              width: '100%',
              margin: 0
            },
            '& .MuiDataGrid-virtualScroller': {
              backgroundColor: theme.paper,
              width: '100%',
              margin: 0
            },
            '& .MuiDataGrid-columnHeadersInner': {
              width: '100%',
              margin: 0,
              padding: 0,
              '& .MuiDataGrid-columnHeader': {
                padding: 0,
                margin: 0,
                '& .MuiDataGrid-columnHeaderTitleContainer': {
                  justifyContent: 'center',
                  padding: '0 16px',
                  margin: 0
                },
                '&:first-of-type': {
                  '& .MuiDataGrid-columnHeaderTitleContainer': {
                    paddingLeft: '24px'
                  }
                },
                '&:last-of-type': {
                  '& .MuiDataGrid-columnHeaderTitleContainer': {
                    paddingRight: '24px'
                  }
                }
              }
            },
            '& .MuiDataGrid-cellContent': {
              justifyContent: 'center',
              width: '100%',
              display: 'flex'
            }
          },
          '& .MuiDataGrid-filler > div': {
            borderTopStyle: 'dashed'
          },
          '& .MuiDataGrid-topContainer::after': {
            height: 0
          },
          footerContainer: {
            borderTop: `1px dashed ${theme.divider}`,
            borderTopStyle: 'dashed',
            minHeight: 'auto',
            backgroundColor: isDark ? theme.headBackgroundColor : theme.colors?.grey200,
            width: '100%',
            margin: 0,
            padding: '0 24px',
            '& .MuiTablePagination-root': {
              overflow: 'visible',
              backgroundColor: 'transparent',
              color: theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
              borderTop: 'none'
            },
            '& .MuiToolbar-root': {
              minHeight: '56px',
              padding: '0',
              '& > p:first-of-type': {
                fontSize: '0.875rem',
                color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
              }
            }
          }
        },
        columnHeader: {
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          height: '48px',
          textAlign: 'center',
          '&:focus': {
            outline: 'none'
          },
          '&:focus-within': {
            outline: 'none'
          },
          '&--sorted': {
            color: theme.darkTextPrimary
          }
        },
        columnHeaderTitle: {
          color: theme.mode === 'dark' ? theme.darkTextSecondary : theme.textDark, // 娴呰壊涓婚浣跨敤娣辫壊鏂囧瓧
          fontWeight: 600,
          fontSize: 14,
          textAlign: 'center'
        },
        columnSeparator: {
          color: theme.divider
        },
        cell: {
          fontSize: '0.875rem',
          padding: '12px 16px',
          borderTopStyle: 'dashed',
          borderBottom: `1px dashed ${theme.divider}`,
          textAlign: 'center',
          '&:focus': {
            outline: 'none'
          },
          '&:focus-within': {
            outline: 'none'
          },
          '&--editing': {
            boxShadow: 'none',
            backgroundColor: varAlpha(theme.colors?.primaryMain, 0.08)
          }
        },
        row: {
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: theme.mode === 'dark' ? varAlpha(theme.headBackgroundColor, 0.9) : varAlpha(theme.colors?.grey200, 0.9)
          },
          '&.Mui-selected': {
            backgroundColor: theme.mode === 'dark' ? varAlpha(theme.menuSelectedBack, 0.72) : varAlpha(theme.menuSelected, 0.72),
            '&:hover': {
              backgroundColor: theme.mode === 'dark' ? varAlpha(theme.menuSelectedBack, 0.94) : varAlpha(theme.menuSelected, 0.94)
            }
          }
        },
        selectedRowCount: {
          display: 'none',
          whiteSpace: 'nowrap'
        },
        toolbarContainer: {
          backgroundColor: theme.paper,
          gap: '16px',
          padding: '16px',
          '& .MuiButton-root': {
            marginRight: '8px'
          }
        },
        panelHeader: {
          backgroundColor: theme.paper,
          padding: '16px 20px',
          borderBottom: `1px dashed ${theme.divider}`
        },
        panelContent: {
          padding: '16px 20px'
        }
      }
    },
    MuiGridFilterForm: {
      styleOverrides: {
        root: {
          padding: '16px 20px'
        }
      }
    },
    MuiDataGridPanel: {
      styleOverrides: {
        root: {
          backgroundColor: theme.paper,
          boxShadow: 'none',
          borderRadius: `${theme?.customization?.borderRadius || 8}px`,
          border: `1px solid ${theme.divider}`
        }
      }
    },
    MuiDataGridColumnHeaderFilterIconButton: {
      styleOverrides: {
        root: {
          color: theme.darkTextSecondary,
          '&:hover': {
            backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
          }
        }
      }
    },
    MuiDataGridPanelFooter: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          borderTop: `1px dashed ${theme.divider}`
        }
      }
    },
    MuiDataGridMenuList: {
      styleOverrides: {
        root: {
          backgroundColor: theme.paper,
          padding: '8px 0'
        }
      }
    },
    MuiDataGridMenu: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            boxShadow: 'none',
            borderRadius: `${theme?.customization?.borderRadius || 8}px`,
            border: `1px solid ${theme.divider}`
          }
        }
      }
    }
  };
}
