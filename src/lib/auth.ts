import { api, getApiErrorMessage } from "./api/client";
import { clearTokens, getRefreshToken, getTokens, setTokens } from "./auth/tokens";
import { emitAuthEvent, onAuthEvent } from "./auth/events";

export type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role:
    | "member"
    | "groupCoordinator"
    | "groupGuarantor"
    | "admin"
    | "group_coordinator"
    | "group_guarantor";
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null; // YYYY-MM-DD (for <input type="date" />)
  address: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  employer: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  membership_status: "pending" | "active" | "suspended" | "inactive";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  groupId?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface PhoneSignInData {
  phone: string;
  fullName?: string;
}

function mapBackendProfile(p: unknown): Profile {
  const profile = p as
    | {
        _id?: string;
        id?: string;
        email?: string;
        fullName?: string | null;
        phone?: string | null;
        dateOfBirth?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        occupation?: string | null;
        employer?: string | null;
        nextOfKinName?: string | null;
        nextOfKinPhone?: string | null;
        nextOfKinRelationship?: string | null;
        membershipStatus?: string;
        avatar?: { url?: string | null };
        createdAt?: string;
        updatedAt?: string;
      }
    | null
    | undefined;

  return {
    id: profile?._id || profile?.id || "",
    email: profile?.email || "",
    full_name: profile?.fullName ?? null,
    phone: profile?.phone ?? null,
    date_of_birth: profile?.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
      : null,
    address: profile?.address ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    occupation: profile?.occupation ?? null,
    employer: profile?.employer ?? null,
    next_of_kin_name: profile?.nextOfKinName ?? null,
    next_of_kin_phone: profile?.nextOfKinPhone ?? null,
    next_of_kin_relationship: profile?.nextOfKinRelationship ?? null,
    membership_status: (profile?.membershipStatus ||
      "pending") as Profile["membership_status"],
    avatar_url: profile?.avatar?.url ?? null,
    created_at: profile?.createdAt
      ? new Date(profile.createdAt).toISOString()
      : new Date().toISOString(),
    updated_at: profile?.updatedAt
      ? new Date(profile.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

type BackendUser = {
  id?: string;
  _id?: string;
  email?: string | null;
  phone?: string | null;
  role?:
    | "member"
    | "groupCoordinator"
    | "groupGuarantor"
    | "admin"
    | "group_coordinator"
    | "group_guarantor"
    | null;
};

function mapBackendUser(u: BackendUser | null | undefined): AuthUser {
  const role = String(u?.role ?? "member");
  return {
    id: u?.id || u?._id || "",
    email: u?.email ?? null,
    phone: u?.phone ?? null,
    role: (role === "admin" ||
    role === "member" ||
    role === "groupCoordinator" ||
    role === "groupGuarantor" ||
    role === "group_coordinator" ||
    role === "group_guarantor"
      ? role
      : "member") as AuthUser["role"],
  };
}

export async function signUp({
  email,
  password,
  fullName,
  phone,
  groupId,
}: SignUpData): Promise<{
  user: AuthUser | null;
  session: AuthSession | null;
  error: Error | null;
}> {
  try {
    const res = await api.post("/auth/signup", {
      email,
      phone,
      password,
      fullName,
      groupId,
    });

    const user = mapBackendUser(res.data?.data?.user);

    return {
      user: user.id ? user : null,
      session: null,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: new Error(getApiErrorMessage(err)),
    };
  }
}

export async function signIn({ email, password }: SignInData): Promise<{
  user: AuthUser | null;
  session: AuthSession | null;
  error: Error | null;
}> {
  try {
    const res = await api.post("/auth/login", { email, password });
    const { accessToken, refreshToken } = res.data || {};

    if (!accessToken || !refreshToken) {
      throw new Error("Missing tokens");
    }

    setTokens({ accessToken, refreshToken });
    emitAuthEvent({ type: "SIGNED_IN" });

    const user = mapBackendUser(res.data?.data?.user);

    return {
      user: user.id ? user : null,
      session: { accessToken, refreshToken, user },
      error: null,
    };
  } catch (err) {
    console.log("SignIn Error!! 💥: ", err);
    return {
      user: null,
      session: null,
      error: new Error(getApiErrorMessage(err)),
    };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  } catch {
    // ignore
  } finally {
    clearTokens();
    emitAuthEvent({ type: "SIGNED_OUT" });
  }

  return { error: null };
}

type ForgotPasswordPayload = {
  email?: string;
  phone?: string;
  loginId?: string;
};

export async function resetPassword(
  identifier: string | ForgotPasswordPayload,
): Promise<{ error: Error | null }> {
  try {
    let payload: ForgotPasswordPayload;

    if (typeof identifier === "string") {
      const value = identifier.trim();
      if (value.includes("@")) {
        payload = { email: value };
      } else {
        payload = { phone: value };
      }
    } else {
      payload = identifier;
    }

    await api.post("/auth/forgot-password", payload);
    return { error: null };
  } catch (err) {
    return { error: new Error(getApiErrorMessage(err)) };
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ error: Error | null }> {
  try {
    const res = await api.post("/auth/reset-password", {
      token,
      password: newPassword,
      autoLogin: true,
    });

    const { accessToken, refreshToken } = res.data || {};
    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      emitAuthEvent({ type: "SIGNED_IN" });
    }

    return { error: null };
  } catch (err) {
    return { error: new Error(getApiErrorMessage(err)) };
  }
}

export async function resetPasswordWithPhoneOtp(
  phone: string,
  otp: string,
  newPassword: string,
  autoLogin = true,
): Promise<{ error: Error | null }> {
  try {
    const res = await api.post("/auth/reset-password", {
      phone,
      otp,
      password: newPassword,
      autoLogin,
    });

    const { accessToken, refreshToken } = res.data || {};
    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      emitAuthEvent({ type: "SIGNED_IN" });
    }

    return { error: null };
  } catch (err) {
    return { error: new Error(getApiErrorMessage(err)) };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: Error | null }> {
  try {
    const res = await api.patch("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    const { accessToken, refreshToken } = res.data || {};
    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      emitAuthEvent({ type: "SIGNED_IN" });
    }

    return { error: null };
  } catch (err) {
    return { error: new Error(getApiErrorMessage(err)) };
  }
}

export async function getSession(): Promise<{
  session: AuthSession | null;
  error: Error | null;
}> {
  try {
    const tokens = getTokens();
    const refreshToken = getRefreshToken();
    if (!tokens && !refreshToken) return { session: null, error: null };

    const res = await api.get("/auth/me");
    const user = mapBackendUser(res.data?.data?.user);
    const latestTokens = getTokens();

    if (!latestTokens) {
      return {
        session: null,
        error: new Error("Missing auth tokens"),
      };
    }

    return {
      session: {
        accessToken: latestTokens.accessToken,
        refreshToken: latestTokens.refreshToken,
        user,
      },
      error: null,
    };
  } catch (err) {
    return { session: null, error: new Error(getApiErrorMessage(err)) };
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { session } = await getSession();
  return session?.user ?? null;
}

export async function getProfile(
  userId: string,
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    // userId is ignored; backend derives from access token
    const res = await api.get("/users/me");
    const p = res.data?.data?.profile;
    return { profile: p ? mapBackendProfile(p) : null, error: null };
  } catch (err) {
    return { profile: null, error: new Error(getApiErrorMessage(err)) };
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    const payload: Record<string, unknown> = {};
    if (typeof updates.full_name !== "undefined")
      payload.fullName = updates.full_name;
    if (typeof updates.phone !== "undefined") payload.phone = updates.phone;
    if (typeof updates.date_of_birth !== "undefined")
      payload.dateOfBirth = updates.date_of_birth;
    if (typeof updates.address !== "undefined")
      payload.address = updates.address;
    if (typeof updates.city !== "undefined") payload.city = updates.city;
    if (typeof updates.state !== "undefined") payload.state = updates.state;
    if (typeof updates.occupation !== "undefined")
      payload.occupation = updates.occupation;
    if (typeof updates.employer !== "undefined")
      payload.employer = updates.employer;
    if (typeof updates.next_of_kin_name !== "undefined")
      payload.nextOfKinName = updates.next_of_kin_name;
    if (typeof updates.next_of_kin_phone !== "undefined")
      payload.nextOfKinPhone = updates.next_of_kin_phone;
    if (typeof updates.next_of_kin_relationship !== "undefined")
      payload.nextOfKinRelationship = updates.next_of_kin_relationship;

    const res = await api.patch("/users/me", payload);
    const p = res.data?.data?.profile;
    return { profile: p ? mapBackendProfile(p) : null, error: null };
  } catch (err) {
    return { profile: null, error: new Error(getApiErrorMessage(err)) };
  }
}

export async function updateMyAvatar(
  file: File | null,
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    let res;
    if (file) {
      const form = new FormData();
      form.append("avatar", file);
      res = await api.patch("/users/me", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      res = await api.patch("/users/me", { avatar: null });
    }

    const p = res.data?.data?.profile;
    return { profile: p ? mapBackendProfile(p) : null, error: null };
  } catch (err) {
    return { profile: null, error: new Error(getApiErrorMessage(err)) };
  }
}

export function onAuthStateChange(
  callback: (event: string, session: AuthSession | null) => void,
) {
  // Fire initial state
  getSession().then(({ session }) => callback("INITIAL_SESSION", session));

  return {
    data: {
      subscription: {
        unsubscribe: onAuthEvent(async (evt) => {
          if (evt.type === "SIGNED_OUT") {
            callback("SIGNED_OUT", null);
            return;
          }

          const { session } = await getSession();
          callback(evt.type, session);
        }),
      },
    },
  };
}

export async function resendConfirmationEmail(
  email: string,
): Promise<{ error: Error | null }> {
  try {
    await api.post("/auth/resend-verification", { email });
    return { error: null };
  } catch (err) {
    return { error: new Error(getApiErrorMessage(err)) };
  }
}

export async function verifyEmailToken(
  token: string,
): Promise<{ ok: boolean; message?: string; error?: Error | null }> {
  try {
    const res = await api.get("/auth/verify-email", { params: { token } });
    return { ok: true, message: res.data?.message || res.data?.data?.message };
  } catch (err) {
    return { ok: false, error: new Error(getApiErrorMessage(err)) };
  }
}

// Phone OTP auth (requires backend endpoints: /auth/phone-otp/send and /auth/phone-otp/verify)
export async function sendPhoneOTP(
  phone: string,
  fullName?: string,
  groupId?: string,
): Promise<{ success: boolean; pinId?: string; error?: string }> {
  try {
    const res = await api.post("/auth/phone-otp/send", {
      phone,
      fullName,
      groupId,
    });
    return { success: true, pinId: res.data?.data?.pinId };
  } catch (err) {
    return { success: false, error: getApiErrorMessage(err) };
  }
}

export async function verifyPhoneOTP(
  pinId: string,
  otp: string,
): Promise<{
  success: boolean;
  verified?: boolean;
  isNewUser?: boolean;
  error?: string;
}> {
  try {
    const res = await api.post("/auth/phone-otp/verify", { pinId, otp });
    const { accessToken, refreshToken } = res.data || {};

    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      emitAuthEvent({ type: "SIGNED_IN" });
    }

    return {
      success: true,
      verified: true,
      isNewUser: Boolean(res.data?.data?.isNewUser),
    };
  } catch (err) {
    return { success: false, verified: false, error: getApiErrorMessage(err) };
  }
}

export async function signInWithPhone({
  phone,
  fullName,
}: PhoneSignInData): Promise<{
  user: AuthUser | null;
  session: AuthSession | null;
  error: Error | null;
  isNewUser: boolean;
}> {
  // This is a convenience wrapper; UI currently uses sendPhoneOTP/verifyPhoneOTP directly.
  try {
    await api.post("/auth/phone-otp/send", { phone, fullName });
    return { user: null, session: null, error: null, isNewUser: false };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: new Error(getApiErrorMessage(err)),
      isNewUser: false,
    };
  }
}

// Google OAuth is currently disabled in the UI.
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  return {
    error: new Error(
      "Google Sign-In is not implemented for the standalone backend yet.",
    ),
  };
}

export async function checkGoogleOAuthAvailable(): Promise<boolean> {
  return false;
}

export function resetGoogleOAuthCache(): void {
  // no-op
}

export function getGoogleOAuthStatus(): boolean | null {
  return false;
}
