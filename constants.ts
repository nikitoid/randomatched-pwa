
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
  }
};

export const COLOR_SCHEMES_DATA: Record<ColorScheme, { 
  label: string; 
  primary: Record<number, string>;
  secondary: Record<number, string>;
}> = {
  indigo: {
    label: 'Индиго',
    primary: PALETTES.indigo,
    secondary: PALETTES.rose
  },
  emerald: {
    label: 'Изумруд',
    primary: PALETTES.emerald,
    secondary: PALETTES.violet
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
  }
};