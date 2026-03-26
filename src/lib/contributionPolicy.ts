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
    allowedMonths?: number[];
  }
> = {
  revolving: {
    label: "Revolving Contribution",
    description:
      "Uniform monthly contribution from January to October. Withdrawals are allowed in October.",
    minAmount: 5_000,
    unitAmount: 5_000,
    allowedMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  special: {
    label: "Special Contribution",
    description:
      "Voluntary bulk contribution from January to October. Withdrawable monthly by the owner.",
    minAmount: 500_000,
    allowedMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
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
  if (config.unitAmount && safeAmount % config.unitAmount !== 0) {
    return {
      valid: false,
      message: `${config.label} must be in multiples of ${formatNaira(config.unitAmount)}.`,
    };
  }
  return { valid: true };
}

