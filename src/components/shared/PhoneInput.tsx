import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeNigerianPhone } from "@/lib/phone";

const DEFAULT_HELPER =
  "Allowed: +234 803 123 4567, 803 123 4567, or 0803 123 4567.";

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
  error?: string | null;
  helperText?: string;
  showHelper?: boolean;
  showPrefix?: boolean;
  prefixText?: string;
  leftAdornment?: React.ReactNode;
  leftAdornmentClassName?: string;
  containerClassName?: string;
  inputClassName?: string;
  helperClassName?: string;
  normalizeOnBlur?: boolean;
  inputPaddingClassName?: string;
};

const stripPrefix = (value: string, prefix: string) => {
  const digits = String(prefix || "").replace(/\D/g, "");
  if (!digits) return value;
  const pattern = new RegExp(`^\\+?${digits}\\s*`);
  return value.replace(pattern, "");
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onValueChange,
      error,
      helperText = DEFAULT_HELPER,
      showHelper = true,
      showPrefix = false,
      prefixText = "+234",
      leftAdornment,
      leftAdornmentClassName,
      containerClassName,
      inputClassName,
      helperClassName,
      normalizeOnBlur = true,
      inputPaddingClassName,
      onBlur,
      onFocus,
      disabled,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const [internalError, setInternalError] = React.useState<string | null>(
      null,
    );

    const displayValue = showPrefix ? stripPrefix(value, prefixText) : value;
    const resolvedError = error ?? internalError;
    const hasAdornment = Boolean(leftAdornment || showPrefix);
    const paddingClass =
      inputPaddingClassName ||
      (showPrefix ? "pl-24" : hasAdornment ? "pl-10" : "");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      let nextValue = event.target.value;
      if (showPrefix) {
        nextValue = stripPrefix(nextValue, prefixText);
      }
      if (internalError) setInternalError(null);
      onValueChange(nextValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (normalizeOnBlur) {
        const rawValue = showPrefix
          ? stripPrefix(event.target.value, prefixText)
          : event.target.value;
        const normalized = normalizeNigerianPhone(rawValue);
        if (normalized) {
          if (normalized !== value) {
            onValueChange(normalized);
          }
          if (internalError) setInternalError(null);
        } else if (rawValue.trim()) {
          setInternalError(DEFAULT_HELPER);
        }
      }
      onBlur?.(event);
    };

    return (
      <div className={cn("space-y-1", containerClassName)}>
        <div className={cn("relative", hasAdornment && "flex items-center")}>
          {hasAdornment && (
            <div
              className={cn(
                "absolute left-3 top-1/2 flex items-center gap-2 text-gray-500 -translate-y-1/2",
                leftAdornmentClassName,
              )}
            >
              {leftAdornment}
              {showPrefix ? (
                <span className="text-sm font-medium text-gray-600">
                  {prefixText}
                </span>
              ) : null}
            </div>
          )}
          <Input
            {...props}
            ref={ref}
            type="tel"
            inputMode="tel"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            disabled={disabled}
            placeholder={
              placeholder ||
              (showPrefix ? "803 123 4567" : "+234 803 123 4567")
            }
            className={cn(paddingClass, inputClassName)}
          />
        </div>
        {resolvedError ? (
          <p className={cn("text-xs text-red-500", helperClassName)}>
            {resolvedError}
          </p>
        ) : showHelper ? (
          <p className={cn("text-xs text-gray-500", helperClassName)}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;
