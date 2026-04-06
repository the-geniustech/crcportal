export type AuthEvent =
  | { type: "SIGNED_IN" }
  | { type: "SIGNED_OUT" }
  | { type: "TOKEN_REFRESHED" };

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export function emitAuthEvent(event: AuthEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // ignore
    }
  }
}

export function onAuthEvent(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
