import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import {
  getProfile,
  getSession,
  onAuthStateChange,
  signOut as authSignOut,
  type AuthUser,
  type AuthSession,
  type Profile,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  connectionError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { profile: userProfile, error } = await getProfile(userId);

      if (error && retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchProfile(userId, retryCount + 1);
      }

      setProfile(userProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const refreshSession = async () => {
    try {
      const { session: freshSession } = await getSession();
      if (freshSession) {
        setSession(freshSession);
        setUser(freshSession.user ?? null);
      }
    } catch (err) {
      console.error("Error refreshing session:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const isConnectionError = (error: unknown): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("refused") ||
        message.includes("network") ||
        message.includes("failed to fetch") ||
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("cors")
      );
    }
    return false;
  };

  const initializeAuth = async () => {
    try {
      setConnectionError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });

      const sessionPromise = getSession();

      const { session: initialSession, error } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof getSession>>;

      if (error) {
        if (isConnectionError(error)) {
          setConnectionError(
            "Unable to connect to the server. Please check your internet connection and try again.",
          );
          setLoading(false);
          return;
        }
        console.error("Error getting initial session:", error);
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      }

      setConnectionError(null);
    } catch (err) {
      console.error("Auth initialization error:", err);

      if (isConnectionError(err)) {
        setConnectionError(
          "Unable to connect to the server. The service may be temporarily unavailable. Please try again later.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setLoading(true);
    setConnectionError(null);
    await initializeAuth();
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      await initializeAuth();
    };

    init();

    const {
      data: { subscription },
    } = onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setConnectionError(null);

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && currentSession?.user) {
        setTimeout(() => {
          if (mounted) fetchProfile(currentSession.user.id);
        }, 200);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    connectionError,
    signOut: handleSignOut,
    refreshProfile,
    refreshSession,
    retryConnection,
  };

  if (connectionError && !loading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 min-h-screen">
          <div className="bg-white shadow-xl p-8 rounded-2xl w-full max-w-md text-center">
            <div className="flex justify-center items-center bg-red-100 mx-auto mb-6 rounded-full w-20 h-20">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="mb-3 font-bold text-gray-900 text-2xl">
              Connection Error
            </h1>

            <p className="mb-6 text-gray-600">{connectionError}</p>

            <div className="bg-gray-50 mb-6 p-4 rounded-xl text-left">
              <p className="mb-2 font-medium text-gray-700 text-sm">
                This could be due to:
              </p>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-gray-400">•</span>
                  <span>Your internet connection is unstable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-gray-400">•</span>
                  <span>The server is temporarily unavailable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-gray-400">•</span>
                  <span>A firewall or VPN is blocking the connection</span>
                </li>
              </ul>
            </div>

            <button
              onClick={retryConnection}
              className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-xl w-full font-semibold text-white transition-colors"
            >
              Try Again
            </button>

            <p className="mt-4 text-gray-400 text-xs">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
