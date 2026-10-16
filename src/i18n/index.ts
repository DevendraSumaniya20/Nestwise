import { en, type Strings } from './en';

// shortcut: English only; add locale files + device-locale detection (react-native-localize) when translating.
export type { Strings };
export const strings: Strings = en;

/** Hook so screens re-render once a language switcher exists. */
export const useT = (): Strings => strings;
