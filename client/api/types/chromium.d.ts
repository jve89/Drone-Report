declare module '@sparticuz/chromium' {
  const chromium: {
    args: string[];
    defaultViewport:
      | {
          width: number;
          height: number;
          deviceScaleFactor: number;
          isMobile: boolean;
          hasTouch: boolean;
          isLandscape: boolean;
        }
      | null;
    executablePath: () => Promise<string>;
    headless: boolean | 'shell';
    setHeadlessMode: (mode: boolean) => void;
    setGraphicsMode: (mode: 'disabled' | 'sandbox' | string) => void;
  };
  export default chromium;
}
