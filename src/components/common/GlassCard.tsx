import React from "react";
import { clsx } from "clsx";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: string;
  hoverEffect?: boolean;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={clsx(
        "glass-card rounded-2xl p-5 sm:p-6 transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
