import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass" | "emerald";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#8183fc] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2",
  };

  const variantStyles = {
    primary: "bg-[#5c68db] hover:bg-[#4f5bc9] active:bg-[#434eb8] text-white font-semibold shadow-sm",
    secondary: "bg-[#151745] text-[#dfe3ff] hover:bg-[#1e2161] border border-[#2d317a]",
    emerald: "bg-[#10b981] hover:bg-[#059669] text-white font-semibold",
    danger: "bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold",
    ghost: "bg-transparent hover:bg-[#151745] text-slate-300 hover:text-white",
    glass: "bg-[#151745]/80 text-[#dfe3ff] hover:bg-[#1f225e] border border-[#2d317a]",
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon}
      {children}
    </button>
  );
};
