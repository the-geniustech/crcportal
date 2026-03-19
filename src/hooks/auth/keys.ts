export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  me: () => [...authKeys.all, "me"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};
