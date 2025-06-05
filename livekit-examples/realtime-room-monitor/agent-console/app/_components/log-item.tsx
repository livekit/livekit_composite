"use client";
import { Badge } from "@/components/ui/badge";
import { getEventLevel, getEventMessage, LogEntry, renderEventLog } from "@/hooks/use-logger";
import { EventLevel, EventSource } from "@/lib/event-types";
import { cn, formatDate } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Server, Settings } from "lucide-react";

const getEventLevelColor = (level: EventLevel) => {
  switch (level) {
    case "info":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "warn":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "error":
      return "bg-red-100 text-red-800 border-red-300";
  }
};

const getSourceIcon = (source: EventSource) => {
  const baseClass = "h-4 w-4 mr-2";
  switch (source) {
    case "server":
      return <ArrowDownCircle className={`${baseClass} text-green-600`} />;
    case "client":
      return <ArrowUpCircle className={`${baseClass} text-blue-600`} />;
    case "system":
      return <Settings className={`${baseClass} text-purple-600`} />;
    default:
      return <Server className={`${baseClass} text-gray-600`} />;
  }
};

export interface LogItemProps extends React.HTMLAttributes<HTMLDivElement> {
  logEntry: LogEntry;
  expandAll: boolean;
}

export const LogItem: React.FC<LogItemProps> = ({ logEntry, expandAll, className, ...rest }) => {
  return (
    <div className={cn("flex flex-col gap-2 px-4 py-3 border-b", className)} {...rest}>
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground mr-12">
          {formatDate(logEntry.timestamp)}
        </span>
        <div className="flex items-center w-18 mr-2">
          {getSourceIcon(logEntry.source)}
          <code className="text-xs font-medium text-muted-foreground">{logEntry.source}</code>
        </div>
        <code className={cn("text-[0.75em] px-1.5 py-[2px] rounded")}>
          {getEventMessage(logEntry)}
        </code>
        <div className="flex-1" />
        <Badge
          variant="outline"
          className={cn(
            getEventLevelColor(getEventLevel(logEntry)),
            "rounded-sm w-12 flex items-center justify-center"
          )}
        >
          {getEventLevel(logEntry)}
        </Badge>
      </div>
      {expandAll && renderEventLog(logEntry)}
    </div>
  );
};
