import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function deriveSocketUrl(): string | null {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) return null;

  try {
    const url = new URL(apiUrl);
    url.pathname = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, "");
  }
}

export function getSocketUrl(): string | null {
  return deriveSocketUrl();
}

export function connectSocket(token?: string): Socket | null {
  const url = deriveSocketUrl();
  if (!url) {
    // eslint-disable-next-line no-console
    console.warn("Missing VITE_API_URL; socket connection disabled.");
    return null;
  }

  if (!socket) {
    socket = io(url, {
      autoConnect: false,
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });
  }

  if (token) {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function getSocket(): Socket | null {
  return socket;
}
