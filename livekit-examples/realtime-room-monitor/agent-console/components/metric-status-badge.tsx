import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const MediaStatusBadge = ({
  enabled,
  enabledIcon,
  disabledIcon,
  label,
  enabledText,
  disabledText,
}: {
  enabled: boolean;
  enabledIcon: React.ReactNode;
  disabledIcon: React.ReactNode;
  label: string;
  enabledText: string;
  disabledText: string;
}) => (
  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
    <div className={cn("p-1 rounded-full", enabled ? "text-green-600" : "text-red-600")}>
      {enabled ? enabledIcon : disabledIcon}
    </div>
    <span className="text-sm">{label}</span>
    <Badge
      variant="outline"
      className={cn("ml-auto", enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}
    >
      {enabled ? enabledText : disabledText}
    </Badge>
  </div>
);
