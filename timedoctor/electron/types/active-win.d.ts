declare module 'active-win' {
  interface Owner {
    name: string;
    processId: number;
    bundleId?: string;
    path: string;
  }

  interface Result {
    title: string;
    owner: Owner;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    url?: string;
    memoryUsage: number;
  }

  export default function activeWindow(): Promise<Result | undefined>;
} 