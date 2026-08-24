import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Celebration } from './Celebration';

type CelebrationRequest = {
  title: string;
  message: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type CelebrationApi = { celebrate: (request: CelebrationRequest) => void };

const Context = createContext<CelebrationApi>({ celebrate: () => undefined });

/**
 * One place for every confetti moment in the app, with a queue — finishing a
 * book on the same evening you hit a 30-day streak should feel like two happy
 * moments in a row, not one on top of the other.
 */
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<CelebrationRequest | null>(null);
  const queue = useRef<CelebrationRequest[]>([]);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    setCurrent(next ?? null);
  }, []);

  const celebrate = useCallback(
    (request: CelebrationRequest) => {
      queue.current.push(request);
      setCurrent((existing) => existing ?? queue.current.shift() ?? null);
    },
    [],
  );

  const api = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <Context.Provider value={api}>
      {children}
      <Celebration
        visible={Boolean(current)}
        onDismiss={showNext}
        title={current?.title ?? ''}
        message={current?.message ?? ''}
        eyebrow={current?.eyebrow}
        actionLabel={current?.actionLabel}
        onAction={
          current?.onAction
            ? () => {
                current.onAction?.();
                showNext();
              }
            : undefined
        }
      />
    </Context.Provider>
  );
}

export const useCelebration = () => useContext(Context);
