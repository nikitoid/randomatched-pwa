// Manual declarations to replace missing vite/client and vite-plugin-pwa/client types

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const svgUrl: string;
  export default svgUrl;
}

declare module '*.jpg' {
  const jpgUrl: string;
  export default jpgUrl;
}

declare module '*.png' {
  const pngUrl: string;
  export default pngUrl;
}

declare module '*.jpeg' {
  const jpegUrl: string;
  export default jpegUrl;
}

declare module '*.gif' {
  const gifUrl: string;
  export default gifUrl;
}

declare module '*.webp' {
  const webpUrl: string;
  export default webpUrl;
}

declare module '*.ico' {
  const icoUrl: string;
  export default icoUrl;
}

declare module '*.bmp' {
  const bmpUrl: string;
  export default bmpUrl;
}

declare module '*.json' {
  const content: any;
  export default content;
}

declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react';
  
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

declare module 'virtual:pwa-register' {
    export interface RegisterSWOptions {
      immediate?: boolean;
      onNeedRefresh?: () => void;
      onOfflineReady?: () => void;
      onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
      onRegisterError?: (error: any) => void;
    }
  
    export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}