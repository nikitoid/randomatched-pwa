import React from 'react';

type BivariantComponent = (props: never) => React.ReactNode;

type ExtractProps<C> = C extends (props: infer P) => React.ReactNode
  ? P & object
  : never;

export interface PreloadableComponent<P> extends React.FC<P> {
  preload: () => Promise<void>;
  isLoaded: () => boolean;
}

export function lazyWithPreload<C extends BivariantComponent>(
  factory: () => Promise<{ default: C }>
): PreloadableComponent<ExtractProps<C>> {
  type Props = ExtractProps<C>;

  let LoadedComponent: C | null = null;
  let inFlightPromise: Promise<{ default: C }> | null = null;
  let LazyComponent: React.LazyExoticComponent<React.ComponentType<Props>> | null = null;

  const load = (): Promise<{ default: C }> => {
    if (LoadedComponent) {
      return Promise.resolve({ default: LoadedComponent });
    }
    if (!inFlightPromise) {
      inFlightPromise = factory()
        .then((mod) => {
          LoadedComponent = mod.default;
          return mod;
        })
        .catch((err: unknown) => {
          inFlightPromise = null;
          LazyComponent = null;
          throw err;
        });
    }
    return inFlightPromise;
  };

  const Wrapper: PreloadableComponent<Props> = (props) => {
    if (LoadedComponent) {
      return React.createElement(
        LoadedComponent as unknown as React.FC<Props>,
        props as Props & React.Attributes
      );
    }
    if (!LazyComponent) {
      LazyComponent = React.lazy(
        () => load() as unknown as Promise<{ default: React.ComponentType<Props> }>
      );
    }
    return React.createElement(
      LazyComponent as unknown as React.FC<Props>,
      props as Props & React.Attributes
    );
  };

  Wrapper.preload = async () => {
    await load();
  };

  Wrapper.isLoaded = () => LoadedComponent !== null;

  return Wrapper;
}
