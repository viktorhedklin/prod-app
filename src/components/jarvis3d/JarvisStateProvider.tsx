import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { JarvisStateContext, JARVIS_THEMES } from '../../jarvisState';
import type { JarvisStateName, JarvisSystemState } from '../../jarvisState';

export interface JarvisStateProviderProps {
  state?: JarvisStateName;
  cognitiveLoad?: number;
  children: React.ReactNode;
}

export type SetJarvisStateFn = (state: JarvisStateName, cognitiveLoad?: number) => void;

export const JarvisSetStateContext = createContext<SetJarvisStateFn>(() => {});

export function useSetJarvisState(): SetJarvisStateFn {
  return useContext(JarvisSetStateContext);
}

export const JarvisStateProvider: React.FC<JarvisStateProviderProps> = ({
  state: propState,
  cognitiveLoad: propCognitiveLoad,
  children,
}) => {
  const [internalState, setInternalState] = useState<JarvisStateName>(propState ?? 'idle');
  const [internalLoad, setInternalLoad] = useState<number>(propCognitiveLoad ?? 0.2);

  useEffect(() => {
    if (propState !== undefined) {
      setInternalState(propState);
    }
  }, [propState]);

  useEffect(() => {
    if (propCognitiveLoad !== undefined) {
      setInternalLoad(propCognitiveLoad);
    }
  }, [propCognitiveLoad]);

  const currentState = propState ?? internalState;
  const currentLoad = propCognitiveLoad ?? internalLoad;

  const [changedAt, setChangedAt] = useState<number>(() => Date.now());
  const prevStateRef = useRef<JarvisStateName>(currentState);

  useEffect(() => {
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;
      setChangedAt(Date.now());
    }
  }, [currentState]);

  const setJarvisState = useMemo<SetJarvisStateFn>(() => {
    return (newState: JarvisStateName, newLoad?: number) => {
      setInternalState(newState);
      if (newLoad !== undefined) {
        setInternalLoad(Math.max(0, Math.min(1, newLoad)));
      }
    };
  }, []);

  const theme = JARVIS_THEMES[currentState] || JARVIS_THEMES.idle;
  const clampedLoad = Math.max(0, Math.min(1, currentLoad));

  const contextValue = useMemo<JarvisSystemState>(() => {
    return {
      state: currentState,
      theme,
      cognitiveLoad: clampedLoad,
      changedAt,
    };
  }, [currentState, theme, clampedLoad, changedAt]);

  return (
    <JarvisStateContext.Provider value={contextValue}>
      <JarvisSetStateContext.Provider value={setJarvisState}>
        {children}
      </JarvisSetStateContext.Provider>
    </JarvisStateContext.Provider>
  );
};

export default JarvisStateProvider;
