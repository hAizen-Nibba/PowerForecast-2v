import React from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "cyan" | "emerald" | "amber" | "rose" | "purple" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const variantStyles = {
    primary: "bg-[#1c1f57] text-[#a2a5ff] border-[#2e3382]",
    cyan: "bg-[#0b2742] text-[#38bdf8] border-[#154673]",
    emerald: "bg-[#0a2c20] text-[#34d399] border-[#135940]",
    amber: "bg-[#332408] text-[#ffd54f] border-[#664910]",
    rose: "bg-[#330f1a] text-[#fb7185] border-[#661e33]",
    purple: "bg-[#251545] text-[#c084fc] border-[#4c2b8c]",
    neutral: "bg-[#151745] text-slate-300 border-[#2d317a]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium rounded-md border",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
