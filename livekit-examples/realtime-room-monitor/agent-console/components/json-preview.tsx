import { cn } from "@/lib/utils";
import JsonView from "@uiw/react-json-view";
import { githubLightTheme } from "@uiw/react-json-view/githubLight";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import { useTheme } from "next-themes";
import { ScrollArea } from "./ui/scroll-area";

type PreviewableDataType = object | string | number | boolean | null | undefined;

const convertToJson = (data: PreviewableDataType) => {
  if (data === null || data === undefined) {
    return {};
  }

  if (typeof data === "object") {
    return data;
  }

  return {
    data: data,
  };
};

const useJsonPreviewTheme = () => {
  const { theme } = useTheme();
  return theme === "dark" ? vscodeTheme : githubLightTheme;
};

export const JsonPreview = ({
  title,
  data,
  collapsed = 1,
  className,
  displayDataTypes = true,
}: {
  title?: string;
  data: PreviewableDataType;
  collapsed?: number | boolean;
  displayDataTypes?: boolean;
  className?: string;
}) => {
  const theme = useJsonPreviewTheme();

  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      {data && (
        <ScrollArea className="border rounded-md" orientation="horizontal">
          <JsonView
            collapsed={collapsed}
            className={cn("p-2.5 pl-1.5 rounded-md", className)}
            value={convertToJson(data)}
            style={theme}
            displayDataTypes={displayDataTypes}
          />
        </ScrollArea>
      )}
      {!data && (
        <div className="text-sm text-muted-foreground italic">
          No {title ? title.toLowerCase() : "data"}
        </div>
      )}
    </div>
  );
};
