export type ContributionTypeCanonical =
  | "revolving"
  | "special"
  | "endwell"
  | "festive";

export type ContributionTypeLegacy =
  | "regular"
  | "special_savings"
  | "end_well"
  | "festival";

export type ContributionTypeValue = ContributionTypeCanonical | ContributionTypeLegacy;

export const ContributionTypeAlias: Record<
  ContributionTypeLegacy,
  ContributionTypeCanonical
> = {
  regular: "revolving",
  special_savings: "special",
  end_well: "endwell",
  festival: "festive",
};

export const ContributionTypeConfig: Record<
  ContributionTypeCanonical,
  {
    label: string;
    description: string;
    minAmount: number;
    unitAmount?: number;
    stepAmount?: number;
    allowedMonths?: number[];
  }
> = {
  revolving: {
    label: "Revolving Contribution",
    description:
      "Uniform monthly contribution with NGN 1,000 per unit. Minimum NGN 5,000 per month.",
    minAmount: 5_000,
    unitAmount: 1_000,
    stepAmount: 5_000,
  },
  special: {
    label: "Special Contribution",
    description:
      "Flexible savings with NGN 1,000 per unit. Minimum NGN 5,000 per contribution.",
    minAmount: 5_000,
    unitAmount: 1_000,
    stepAmount: 5_000,
  },
  endwell: {
    label: "Endwell Contribution",
    description:
      "Monthly savings towards retirement or long-term goals (minimum five years).",
    minAmount: 5_000,
  },
  festive: {
    label: "Festive Contribution",
    description:
      "Monthly contribution for specific festivals (e.g., Christmas or Eid).",
    minAmount: 2_000,
  },
};

export const ContributionTypeOptions = (
  Object.keys(ContributionTypeConfig) as ContributionTypeCanonical[]
).map((key) => ({
  value: key,
  ...ContributionTypeConfig[key],
}));

export function normalizeContributionType(
  value?: string | null,
): ContributionTypeCanonical | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  if (raw === "revolving" || raw === "special" || raw === "endwell" || raw === "festive") {
    return raw as ContributionTypeCanonical;
  }
  if (raw in ContributionTypeAlias) {
    return ContributionTypeAlias[raw as ContributionTypeLegacy];
  }
  return null;
}

export function getContributionTypeMatch(
  value?: string | null,
): ContributionTypeValue[] | null {
  if (!value) return null;
  const canonical = normalizeContributionType(value);
  if (!canonical) return null;
  const matches: ContributionTypeValue[] = [canonical];
  if (canonical === "revolving") matches.push("regular");
  if (canonical === "special") matches.push("special_savings");
  if (canonical === "endwell") matches.push("end_well");
  if (canonical === "festive") matches.push("festival");
  return matches;
}

export function getContributionTypeLabel(value?: string | null) {
  const canonical = normalizeContributionType(value);
  if (!canonical) return "Contribution";
  return ContributionTypeConfig[canonical]?.label ?? "Contribution";
}

export function getContributionTypeDescription(value?: string | null) {
  const canonical = normalizeContributionType(value);
  if (!canonical) return "";
  return ContributionTypeConfig[canonical]?.description ?? "";
}

export function getContributionTypeConfig(value?: string | null) {
  const canonical = normalizeContributionType(value);
  if (!canonical) return null;
  return ContributionTypeConfig[canonical] ?? null;
}

export function formatNaira(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export const CONTRIBUTION_UNIT_BASE = 1000;
export const CONTRIBUTION_INTEREST_PER_UNIT = 35;

export function calculateContributionUnits(amount: number) {
  const safe = Number(amount);
  if (!Number.isFinite(safe) || safe <= 0) return 0;
  return safe / CONTRIBUTION_UNIT_BASE;
}

export function calculateContributionInterest(amount: number) {
  const units = calculateContributionUnits(amount);
  if (!units) return 0;
  return Math.round(units * CONTRIBUTION_INTEREST_PER_UNIT * 100) / 100;
}

export function isContributionInterestEligible(value?: string | null) {
  const normalized = normalizeContributionType(value);
  if (normalized) return normalized === "revolving";
  if (value === null || typeof value === "undefined") return true;
  const raw = String(value || "").trim();
  if (!raw) return true;
  return false;
}

export function calculateContributionInterestForType(
  value: string | null | undefined,
  amount: number,
) {
  if (!isContributionInterestEligible(value)) return 0;
  return calculateContributionInterest(amount);
}

export function validateContributionAmount(
  type: ContributionTypeCanonical,
  amount: number,
) {
  const config = ContributionTypeConfig[type];
  const safeAmount = Number(amount || 0);
  if (!config) {
    return { valid: false, message: "Invalid contribution type." };
  }
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { valid: false, message: "Please enter a valid contribution amount." };
  }
  if (safeAmount < config.minAmount) {
    return {
      valid: false,
      message: `Minimum for ${config.label} is ${formatNaira(config.minAmount)}.`,
    };
  }
  const step = config.stepAmount ?? config.unitAmount;
  if (step && safeAmount % step !== 0) {
    return {
      valid: false,
      message: `${config.label} must be in multiples of ${formatNaira(step)}.`,
    };
  }
  return { valid: true };
}
