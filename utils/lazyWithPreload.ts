import React from 'react';

export interface PreloadableComponent<P> extends React.FC<P> {
  preload: () => Promise<void>;
  isLoaded: () => boolean;
}

export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<React.ComponentProps<T>> {
  let LoadedComponent: T | null = null;
  let inFlightPromise: Promise<{ default: T }> | null = null;
  let LazyComponent: React.LazyExoticComponent<T> | null = null;

  const load = (): Promise<{ default: T }> => {
    if (LoadedComponent) {
      return Promise.resolve({ default: LoadedComponent });
    }
    if (!inFlightPromise) {
      inFlightPromise = factory()
        .then((mod) => {
          LoadedComponent = mod.default;
          return mod;
        })
        .catch((err) => {
          inFlightPromise = null;
          LazyComponent = null;
          throw err;
        });
    }
    return inFlightPromise;
  };

  const Wrapper: PreloadableComponent<React.ComponentProps<T>> = (props) => {
    if (LoadedComponent) {
      return React.createElement(LoadedComponent, props);
    }
    if (!LazyComponent) {
      LazyComponent = React.lazy(load);
    }
    return React.createElement(LazyComponent, props);
  };

  Wrapper.preload = async () => {
    await load();
  };

  Wrapper.isLoaded = () => LoadedComponent !== null;

  return Wrapper;
}
