import { cn } from "@/lib/utils";

export interface MetricBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number | undefined;
  unit?: string;
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  unit,
  className,
  ...props
}) => {
  const displayValue = () => {
    if (value === undefined || value === null) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div className={cn("flex flex-col gap-1 p-2 bg-muted/50 rounded-md", className)} {...props}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-medium truncate">{displayValue()}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
};
