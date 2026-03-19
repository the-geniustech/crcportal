import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Socket } from "socket.io-client";

import { useAuth } from "@/contexts/AuthContext";
import { getTokens } from "@/lib/auth/tokens";
import { connectSocket, disconnectSocket } from "@/lib/socket";

type SocketContextValue = Socket | null;

const SocketContext = createContext<SocketContextValue>(null);

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  const accessToken = useMemo(() => {
    return session?.accessToken || getTokens()?.accessToken || null;
  }, [session?.accessToken]);

  useEffect(() => {
    if (!user || !accessToken) {
      disconnectSocket();
      setSocket(null);
      lastTokenRef.current = null;
      return;
    }

    if (lastTokenRef.current && lastTokenRef.current !== accessToken) {
      disconnectSocket();
    }

    const nextSocket = connectSocket(accessToken);
    setSocket(nextSocket);
    lastTokenRef.current = accessToken;

    if (!nextSocket) return undefined;

    const handleError = (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Socket connection error", err);
    };

    nextSocket.on("connect_error", handleError);
    nextSocket.on("error", handleError);

    return () => {
      nextSocket.off("connect_error", handleError);
      nextSocket.off("error", handleError);
    };
  }, [user, accessToken]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
