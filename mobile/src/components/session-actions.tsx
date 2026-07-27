import { createContext, ReactNode, useContext } from 'react';

// Session-launch callbacks + session-active flag exposed to any tab-root that
// needs to trigger Start or Resume (currently: Home hero card).
export type SessionActions = {
  sessionActive: boolean;
  onStartPress: () => void;
  onResumePress: () => void;
};

const Ctx = createContext<SessionActions | null>(null);

export function SessionActionsProvider({
  value,
  children,
}: {
  value: SessionActions;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSessionActions(): SessionActions {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessionActions: SessionActionsProvider missing');
  return v;
}
