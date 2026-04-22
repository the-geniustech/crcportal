import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { useAdminGroupsQuery } from "@/hooks/admin/useAdminGroupsQuery";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AdminGroupOption = {
  id: string;
  name: string;
  groupNumber: number | null;
  location: string | null;
};

interface AdminGroupFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  allValue?: string;
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

function mapGroupOption(group: {
  _id: string;
  groupName: string;
  groupNumber?: number;
  location?: string | null;
}): AdminGroupOption {
  const groupNumber =
    typeof group.groupNumber === "number" && Number.isFinite(group.groupNumber)
      ? group.groupNumber
      : null;
  const fallbackName = groupNumber ? `Group ${groupNumber}` : "Group";

  return {
    id: String(group._id),
    name: String(group.groupName || fallbackName).trim() || fallbackName,
    groupNumber,
    location: group.location ? String(group.location) : null,
  };
}

export default function AdminGroupFilter({
  value,
  onValueChange,
  allValue = "all",
  allLabel = "All groups",
  placeholder = "Filter by group",
  searchPlaceholder = "Search groups by name",
  className,
  disabled = false,
}: AdminGroupFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<AdminGroupOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<AdminGroupOption | null>(
    null,
  );

  const groupsQuery = useAdminGroupsQuery(
    {
      includeMetrics: false,
      search: deferredSearch || undefined,
      limit: 10,
      page,
    },
    open,
  );

  const fetchedOptions = useMemo(
    () => (groupsQuery.data?.groups ?? []).map(mapGroupOption),
    [groupsQuery.data?.groups],
  );

  useEffect(() => {
    setPage(1);
    setOptions([]);
  }, [deferredSearch]);

  useEffect(() => {
    if (page === 1) {
      setOptions(fetchedOptions);
      return;
    }

    setOptions((current) => {
      const next = [...current];
      fetchedOptions.forEach((option) => {
        if (!next.some((entry) => entry.id === option.id)) {
          next.push(option);
        }
      });
      return next;
    });
  }, [fetchedOptions, page]);

  useEffect(() => {
    if (value === allValue) {
      setSelectedOption(null);
      return;
    }

    const match =
      options.find((option) => option.id === value) ||
      fetchedOptions.find((option) => option.id === value) ||
      null;

    if (match) {
      setSelectedOption(match);
    }
  }, [allValue, fetchedOptions, options, value]);

  useEffect(() => {
    if (open) return;
    setSearchInput("");
    setPage(1);
  }, [open]);

  const totalAvailable = groupsQuery.data?.meta.total ?? 0;
  const visibleCount =
    totalAvailable > 0 ? Math.min(options.length, totalAvailable) : options.length;
  const isInitialLoading = groupsQuery.isLoading && options.length === 0;
  const isLoadingNextPage = groupsQuery.isFetching && page > 1;
  const hasNextPage = totalAvailable > options.length;
  const isSearching = groupsQuery.isFetching && page === 1;
  const triggerLabel =
    value === allValue ? allLabel : selectedOption?.name || placeholder;

  const selectValue = (nextValue: string, option?: AdminGroupOption | null) => {
    if (nextValue === allValue) {
      setSelectedOption(null);
    } else if (option) {
      setSelectedOption(option);
    }

    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => selectValue(allValue, null)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60"
          >
            <Check
              className={cn(
                "h-4 w-4",
                value === allValue ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="truncate">{allLabel}</span>
          </button>

          {isInitialLoading && (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading groups...
            </div>
          )}

          {!isInitialLoading && options.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No groups matched your search.
            </div>
          )}

          {!isInitialLoading &&
            options.map((option) => {
              const subtitle = [
                option.groupNumber ? `Group ${option.groupNumber}` : null,
                option.location,
              ]
                .filter(Boolean)
                .join(" - ");

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectValue(option.id, option)}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      value === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {option.name}
                    </span>
                    {subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {subtitle}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>
            {totalAvailable > 0
              ? `${visibleCount} of ${totalAvailable} groups`
              : options.length > 0
                ? `${options.length} groups loaded`
                : "No groups available"}
          </span>
          {hasNextPage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={groupsQuery.isFetching}
              className="h-8 px-2 text-xs"
            >
              {isLoadingNextPage && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              {isLoadingNextPage ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
