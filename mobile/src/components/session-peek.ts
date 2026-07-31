import { createContext, useContext } from 'react';

// The peek label + timer origin are published from InSessionScreen (which owns
// ActiveSessionState) and consumed by the SessionSheet peek footer. Kept in its
// own module so InSessionScreen can import the publisher hook without importing
// SessionSheet (which renders InSessionScreen) — that back-edge is a require
// cycle. Default publisher is a no-op so InSessionScreen still renders in
// isolation (its tests don't wrap in the provider).
export type PeekMeta = {
  label: string | null;
  startedAtMs: number | null;
};

export type PeekPublisher = (meta: PeekMeta) => void;

export const PeekMetaCtx = createContext<PeekMeta>({ label: null, startedAtMs: null });
export const PeekPublisherCtx = createContext<PeekPublisher>(() => {});

// Publish peek metadata (current-drill label + session startedAt) from the
// component that owns ActiveSessionState (InSessionScreen). A no-op by default
// so callers outside a SessionSheetProvider (tests) don't have to wire it up.
export function useSessionPeekPublisher(): PeekPublisher {
  return useContext(PeekPublisherCtx);
}

// Read the current peek metadata (consumed by the SessionSheet peek footer).
export function useSessionPeekMeta(): PeekMeta {
  return useContext(PeekMetaCtx);
}
