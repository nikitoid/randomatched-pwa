
import { Hero, ColorScheme } from './types';

export const RANKS = [
  "S+", "S-",
  "A+", "A-",
  "B+", "B-",
  "C+", "C-",
  "D+", "D-",
  "E+", "E-"
];

export const RANK_VALUES: Record<string, number> = {
  "S+": 12, "S-": 11,
  "A+": 10, "A-": 9,
  "B+": 8, "B-": 7,
  "C+": 6, "C-": 5,
  "D+": 4, "D-": 3,
  "E+": 2, "E-": 1
};

// Define raw palettes to be reused in schemes
const PALETTES: Record<string, Record<number, string>> = {
  indigo: {
    50: '238 242 255', 100: '224 231 255', 200: '199 210 254', 300: '165 180 252',
    400: '129 140 248', 500: '99 102 241', 600: '79 70 229', 700: '67 56 202',
    800: '55 48 163', 900: '49 46 129', 950: '30 27 75'
  },
  emerald: {
    50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183',
    400: '52 211 153', 500: '16 185 129', 600: '5 150 105', 700: '4 120 87',
    800: '6 95 70', 900: '6 78 59', 950: '2 44 34'
  },
  rose: {
    50: '255 241 242', 100: '255 228 230', 200: '254 205 211', 300: '253 164 175',
    400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 700: '190 18 60',
    800: '159 18 57', 900: '136 19 55', 950: '76 5 25'
  },
  amber: {
    50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77',
    400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 700: '180 83 9',
    800: '146 64 14', 900: '120 53 15', 950: '69 26 3'
  },
  violet: {
    50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253',
    400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217',
    800: '91 33 182', 900: '76 29 149', 950: '46 16 101'
  },
  sky: {
    50: '240 249 255', 100: '224 242 254', 200: '186 230 253', 300: '125 211 252',
    400: '56 189 248', 500: '14 165 233', 600: '2 132 199', 700: '3 105 161',
    800: '7 89 133', 900: '12 74 110', 950: '8 47 73'
  },
  orange: {
    50: '255 247 237', 100: '255 237 213', 200: '254 215 170', 300: '253 186 116',
    400: '251 146 60', 500: '249 115 22', 600: '234 88 12', 700: '194 65 12',
    800: '154 52 18', 900: '124 45 18', 950: '67 20 7'
  },
  slate: {
    50: '248 250 252', 100: '241 245 249', 200: '226 232 240', 300: '203 213 225',
    400: '148 163 184', 500: '100 116 139', 600: '71 85 105', 700: '51 65 85',
    800: '30 41 59', 900: '15 23 42', 950: '2 6 23'
  },
  forest: {
    50: '240 253 244', 100: '220 252 231', 200: '187 247 208', 300: '134 239 172',
    400: '74 222 128', 500: '34 197 94', 600: '22 163 74', 700: '21 128 61',
    800: '22 101 52', 900: '20 83 45', 950: '5 46 22'
  },
  fuchsia: {
    50: '253 244 255', 100: '250 232 255', 200: '245 208 254', 300: '240 171 252',
    400: '232 121 249', 500: '217 70 239', 600: '192 38 211', 700: '162 28 175',
    800: '134 25 143', 900: '112 26 117', 950: '74 4 78'
  }
};

export const COLOR_SCHEMES_DATA: Record<ColorScheme, {
  label: string;
  primary: Record<number, string>;
  secondary: Record<number, string>;
}> = {
  emerald: {
    label: 'Изумруд',
    primary: PALETTES.emerald,
    secondary: PALETTES.violet
  },
  indigo: {
    label: 'Индиго',
    primary: PALETTES.indigo,
    secondary: PALETTES.rose
  },
  rose: {
    label: 'Роза',
    primary: PALETTES.rose,
    secondary: PALETTES.sky
  },
  amber: {
    label: 'Янтарь',
    primary: PALETTES.amber,
    secondary: PALETTES.indigo
  },
  violet: {
    label: 'Фиолетовый',
    primary: PALETTES.violet,
    secondary: PALETTES.emerald
  },
  sky: {
    label: 'Небо',
    primary: PALETTES.sky,
    secondary: PALETTES.orange
  },
  slate: {
    label: 'Уголь',
    primary: PALETTES.slate,
    secondary: PALETTES.emerald
  },
  forest: {
    label: 'Лес',
    primary: PALETTES.forest,
    secondary: PALETTES.amber
  },
  cyberpunk: {
    label: 'Киберпанк',
    primary: PALETTES.fuchsia,
    secondary: PALETTES.sky
  },
  sunset: {
    label: 'Закат',
    primary: PALETTES.orange,
    secondary: PALETTES.rose
  }
};