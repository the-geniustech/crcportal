import { useEffect, useMemo, useState } from "react";
import { Percent, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminContributionInterestSettingsQuery } from "@/hooks/admin/useAdminContributionInterestSettingsQuery";
import { useUpdateAdminContributionInterestSettingsMutation } from "@/hooks/admin/useUpdateAdminContributionInterestSettingsMutation";

const MONTHS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

const DEFAULT_RATE_PER_THOUSAND = 35;

const formatPct = (rate: number) => `${(rate / 10).toFixed(2)}%`;

export default function ContributionInterestSettings() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [bulkRate, setBulkRate] = useState(String(DEFAULT_RATE_PER_THOUSAND));
  const settingsQuery = useAdminContributionInterestSettingsQuery({
    year: selectedYear,
  });
  const updateMutation = useUpdateAdminContributionInterestSettingsMutation();

  const baseRates = useMemo(() => {
    const map = new Map<number, number>();
    (settingsQuery.data?.rates ?? []).forEach((rate) => {
      map.set(rate.month, rate.ratePerThousand);
    });
    return map;
  }, [settingsQuery.data?.rates]);

  const [draftRates, setDraftRates] = useState<Record<number, string>>({});

  useEffect(() => {
    if (settingsQuery.data?.rates?.length) {
      const next: Record<number, string> = {};
      settingsQuery.data.rates.forEach((rate) => {
        next[rate.month] = String(rate.ratePerThousand);
      });
      setDraftRates(next);
    } else {
      const fallback: Record<number, string> = {};
      MONTHS.forEach((month) => {
        fallback[month.value] = String(DEFAULT_RATE_PER_THOUSAND);
      });
      setDraftRates(fallback);
    }
  }, [settingsQuery.data?.rates, selectedYear]);

  const parsedRates = useMemo(() => {
    const next: Record<number, number> = {};
    MONTHS.forEach((month) => {
      const raw = draftRates[month.value];
      const value = Number(raw);
      next[month.value] = Number.isFinite(value) ? value : NaN;
    });
    return next;
  }, [draftRates]);

  const hasChanges = useMemo(() => {
    return MONTHS.some((month) => {
      const base = baseRates.get(month.value) ?? DEFAULT_RATE_PER_THOUSAND;
      const current = parsedRates[month.value];
      return Number.isFinite(current) && current !== base;
    });
  }, [baseRates, parsedRates]);

  const applyBulkRate = () => {
    const value = Number(bulkRate);
    if (!Number.isFinite(value) || value < 0) {
      toast({
        title: "Invalid rate",
        description: "Please enter a valid numeric rate per 1,000.",
        variant: "destructive",
      });
      return;
    }
    const next: Record<number, string> = {};
    MONTHS.forEach((month) => {
      next[month.value] = String(value);
    });
    setDraftRates(next);
  };

  const resetDefaults = () => {
    const next: Record<number, string> = {};
    MONTHS.forEach((month) => {
      next[month.value] = String(DEFAULT_RATE_PER_THOUSAND);
    });
    setDraftRates(next);
  };

  const handleSave = async () => {
    const payload: Record<number, number> = {};
    for (const month of MONTHS) {
      const value = parsedRates[month.value];
      if (!Number.isFinite(value) || value < 0) {
        toast({
          title: "Invalid rate",
          description: `Rate for ${month.label} must be a valid number.`,
          variant: "destructive",
        });
        return;
      }
      payload[month.value] = value;
    }

    try {
      await updateMutation.mutateAsync({
        year: selectedYear,
        rates: payload,
      });
      toast({
        title: "Interest settings saved",
        description: "Monthly interest rates have been updated.",
      });
      settingsQuery.refetch();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update interest settings.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_v, i) => currentYear - i);
  }, [currentYear]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Interest Settings
          </h2>
          <p className="text-sm text-gray-500">
            Configure monthly interest rates applied to contribution balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={resetDefaults}
            className="gap-2"
            disabled={updateMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={updateMutation.isPending || !hasChanges}
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Configuration Year
              </p>
              <p className="text-sm text-slate-600">
                Rates apply to earned interest for the selected year.
              </p>
            </div>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
            <Percent className="h-4 w-4 text-emerald-600" />
            <span>
              Default rate is{" "}
              <span className="font-semibold">
                {DEFAULT_RATE_PER_THOUSAND}/1000
              </span>{" "}
              ({formatPct(DEFAULT_RATE_PER_THOUSAND)}) per month.
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                value={bulkRate}
                onChange={(event) => setBulkRate(event.target.value)}
                className="w-32"
                placeholder="Rate / 1000"
              />
              <Button variant="outline" onClick={applyBulkRate}>
                Apply to All Months
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Hint: 35/1000 equals {formatPct(35)}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Interest Rules
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              Interest earned in a month is calculated on the previous cumulative
              balance.
            </li>
            <li>
              Interest on a contribution is earned in the subsequent month.
            </li>
            <li>
              Individual members receive 69% of total earned interest.
            </li>
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Monthly Interest Rates
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-left">Rate / 1000</th>
                <th className="px-5 py-3 text-left">Rate (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MONTHS.map((month) => {
                const value = parsedRates[month.value];
                const base = baseRates.get(month.value) ?? DEFAULT_RATE_PER_THOUSAND;
                const hasError = !Number.isFinite(value) || value < 0;
                const isChanged =
                  Number.isFinite(value) && Number.isFinite(base) && value !== base;
                return (
                  <tr key={month.value} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {month.label}
                    </td>
                    <td className="px-5 py-3">
                      <Input
                        value={draftRates[month.value] ?? ""}
                        onChange={(event) =>
                          setDraftRates((prev) => ({
                            ...prev,
                            [month.value]: event.target.value,
                          }))
                        }
                        className={`w-32 ${
                          hasError
                            ? "border-rose-400 focus-visible:ring-rose-400"
                            : isChanged
                              ? "border-emerald-400 focus-visible:ring-emerald-400"
                              : ""
                        }`}
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {Number.isFinite(value) ? formatPct(value) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {settingsQuery.isError && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            {(settingsQuery.error as Error)?.message ||
              "Failed to load interest settings."}
          </div>
        )}
      </div>
    </div>
  );
}
