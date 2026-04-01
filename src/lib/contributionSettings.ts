import { api, getApiErrorMessage } from "@/lib/api/client";

export type ContributionSettingsWindow = {
  startMonth: number;
  endMonth: number;
};

export type PlannedContributionType = "revolving" | "endwell" | "festive";

export type ContributionSettingsUnits = Record<
  PlannedContributionType,
  number | null
>;

export type ContributionSettings = {
  year: number;
  units: ContributionSettingsUnits;
  updatedAt?: string | null;
  canEdit: boolean;
  window: ContributionSettingsWindow;
};

export async function getContributionSettings() {
  try {
    const res = await api.get("/users/me/contribution-settings");
    return res.data?.data?.settings as ContributionSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateContributionSettings(payload: {
  units: Partial<ContributionSettingsUnits>;
  year?: number;
}) {
  try {
    const res = await api.put("/users/me/contribution-settings", payload);
    return res.data?.data?.settings as ContributionSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
