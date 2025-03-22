declare module 'node-active-window' {
  interface ActiveWindowInfo {
    application: string;
    title: string;
    platform: string;
    pid?: number;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  export function getActiveWindow(): Promise<ActiveWindowInfo>;
} 