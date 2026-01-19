// Temporary TS lib compatibility: some environments/typescript configs don't include ES2021 String#replaceAll
// This is only for type-checking; runtime already supports or is polyfilled by the browser.

export {};

declare global {
  interface String {
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  }
}
