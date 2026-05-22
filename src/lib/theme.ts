import { BrandVariants, createLightTheme, Theme } from '@fluentui/react-components'

/**
 * Identidade Visual Oficial — Vale S.A.
 * Verde Vale:   #00807C
 * Amarelo Vale: #EEA722
 * Branco:       #FFFFFF
 */

// Paleta de brand baseada no Verde Vale (#00807C)
const valeBrand: BrandVariants = {
  10:  '#00807C',
  20:  '#00807C',
  30:  '#00807C',
  40:  '#00807C',
  50:  '#00807C',
  60:  '#00807C',
  70:  '#00807C',
  80:  '#00807C',
  90:  '#00807C',
  100: '#EEA722',
  110: '#EEA722',
  120: '#EEA722',
  130: '#EEA722',
  140: '#FFFFFF',
  150: '#FFFFFF',
  160: '#FFFFFF',
}

export const valeTheme: Theme = {
  ...createLightTheme(valeBrand),
  fontFamilyBase:
    "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  
  // Estritos overrides de tokens do Fluent UI
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground1Hover: '#EEA722',
  colorNeutralBackground1Pressed: '#EEA722',
  colorNeutralBackground1Selected: '#00807C',
  
  colorNeutralBackground2: '#FFFFFF',
  colorNeutralBackground2Hover: '#EEA722',
  colorNeutralBackground2Pressed: '#EEA722',
  colorNeutralBackground2Selected: '#00807C',

  colorNeutralBackground3: '#FFFFFF',
  colorNeutralBackground3Hover: '#EEA722',
  colorNeutralBackground3Pressed: '#EEA722',
  colorNeutralBackground3Selected: '#00807C',

  colorNeutralBackground4: '#FFFFFF',
  colorNeutralBackground5: '#FFFFFF',
  colorNeutralBackground6: '#FFFFFF',

  colorNeutralForeground1: '#00807C',
  colorNeutralForeground2: '#00807C',
  colorNeutralForeground3: '#00807C',
  colorNeutralForeground4: '#00807C',
  colorNeutralForegroundDisabled: '#00807C',
  
  colorNeutralStroke1: '#00807C',
  colorNeutralStroke2: '#00807C',
  colorNeutralStroke3: '#EEA722',
  colorNeutralStrokeAccessible: '#00807C',
  colorNeutralStrokeAccessibleHover: '#EEA722',
  colorNeutralStrokeAccessiblePressed: '#EEA722',
  colorNeutralStrokeAccessibleSelected: '#EEA722',
  
  colorBrandBackground: '#00807C',
  colorBrandBackgroundHover: '#EEA722',
  colorBrandBackgroundPressed: '#EEA722',
  colorBrandBackgroundSelected: '#00807C',
  
  colorBrandForeground1: '#00807C',
  colorBrandForeground2: '#00807C',
  colorBrandForegroundLink: '#00807C',
  colorBrandForegroundLinkHover: '#EEA722',
  colorBrandForegroundLinkPressed: '#EEA722',
  colorBrandForegroundLinkSelected: '#00807C',
  
  colorBrandStroke1: '#00807C',
  colorBrandStroke2: '#EEA722',
  
  // Statuses & Palettes
  colorStatusSuccessBackground1: '#00807C',
  colorStatusSuccessForeground1: '#FFFFFF',
  colorStatusSuccessBorder1: '#00807C',
  
  colorStatusWarningBackground1: '#EEA722',
  colorStatusWarningForeground1: '#FFFFFF',
  colorStatusWarningBorder1: '#EEA722',
  
  colorStatusDangerBackground1: '#EEA722',
  colorStatusDangerForeground1: '#FFFFFF',
  colorStatusDangerBorder1: '#EEA722',
  
  colorPaletteRedBackground1: '#EEA722',
  colorPaletteRedForeground1: '#FFFFFF',
  colorPaletteRedBorder1: '#EEA722',
  colorPaletteGreenBackground1: '#00807C',
  colorPaletteGreenForeground1: '#FFFFFF',
  colorPaletteGreenBorder1: '#00807C',
  colorPaletteMarigoldBackground1: '#EEA722',
  colorPaletteMarigoldForeground1: '#00807C',
  colorPaletteMarigoldBorder1: '#EEA722',
}

/** Tokens da identidade Vale para uso direto em estilos */
export const VALE = {
  green:       '#00807C',
  greenDark:   '#00807C',
  greenLight:  '#FFFFFF',
  greenMid:    '#00807C',

  yellow:      '#EEA722',
  yellowDark:  '#EEA722',
  yellowLight: '#FFFFFF',

  gray:        '#00807C',
  grayLight:   '#FFFFFF',
  grayDark:    '#00807C',

  black:       '#00807C',
  white:       '#FFFFFF',

  // Backgrounds
  sidebarBg:   '#00807C',
  sidebarBg2:  '#00807C',
  sidebarBorder: '#EEA722',
} as const

