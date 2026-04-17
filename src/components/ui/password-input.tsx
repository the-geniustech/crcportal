import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  containerClassName?: string;
  leftAdornment?: React.ReactNode;
  leftAdornmentClassName?: string;
  toggleButtonClassName?: string;
  useDefaultStyles?: boolean;
};

const defaultInputClasses =
  "flex h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      containerClassName,
      disabled,
      leftAdornment,
      leftAdornmentClassName,
      toggleButtonClassName,
      useDefaultStyles = true,
      ...props
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        {leftAdornment ? (
          <span
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400",
              leftAdornmentClassName,
            )}
          >
            {leftAdornment}
          </span>
        ) : null}

        <input
          {...props}
          ref={ref}
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          className={cn(
            "disabled:cursor-not-allowed disabled:opacity-50",
            useDefaultStyles && defaultInputClasses,
            className,
            "pr-11",
          )}
        />

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            toggleButtonClassName,
          )}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
