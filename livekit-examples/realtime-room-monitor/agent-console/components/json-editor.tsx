"use client";

import { cn } from "@/lib/utils";
import Editor, { useMonaco } from "@monaco-editor/react";
import { CircleAlert } from "lucide-react";
import { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const darkEditorTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#09090b",
  },
};

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const JsonEditor = ({ value = "{}", onChange, className }: JsonEditorProps) => {
  const { theme } = useTheme();
  const monaco = useMonaco();
  const [isValid, setIsValid] = useState(true);
  const [localValue, setLocalValue] = useState(value);
  const [lineCount, setLineCount] = useState(1);
  const lineHeight = 19; // Monaco's default line height
  const padding = 30;
  const [validationErrors, setValidationErrors] = useState<editor.IMarker[]>([]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("customDarkTheme", darkEditorTheme);
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [],
        allowComments: false,
        enableSchemaRequest: true,
      });
    }
  }, [monaco]);

  useEffect(() => {
    const lines = localValue.split("\n").length;
    setLineCount(Math.max(lines, 1));
  }, [localValue]);

  const handleValidate = (markers: editor.IMarker[]) => {
    setIsValid(markers.length === 0);
    setValidationErrors(markers);
  };

  return (
    <div className={cn("w-full flex flex-col gap-2 group", className)}>
      <div
        className={cn(
          "border rounded-lg overflow-hidden",
          "border-border dark:border-muted",
          "transition-colors relative pt-2",
          !isValid ? "border-red-500/50" : "hover:border-foreground/30"
        )}
      >
        <Editor
          className="w-full absolute inset-0"
          height={100}
          defaultLanguage="json"
          language="json"
          theme={theme === "dark" ? "customDarkTheme" : "vs-light"}
          value={localValue}
          options={{
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: "always",
            scrollBeyondLastLine: true,
            lineNumbers: "on",
            roundedSelection: false,
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
          onChange={(val) => {
            setLocalValue(val || "");
            onChange?.(val || "");
          }}
          onValidate={handleValidate}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("customDarkTheme", darkEditorTheme);
          }}
        />
      </div>
      {!isValid && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="rounded-lg border border-red-500/50 px-4 py-3 text-red-600">
            <div className="flex gap-3">
              <CircleAlert
                className="mt-0.5 shrink-0 opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              <div className="grow space-y-1">
                <p className="text-sm font-medium">
                  Invalid JSON ({validationErrors.length} issue
                  {validationErrors.length > 1 ? "s" : ""} found):
                </p>
                <ul className="list-inside list-disc text-sm opacity-80">
                  {validationErrors.slice(0, 3).map((error, index) => (
                    <li key={index}>
                      Line {error.startLineNumber}: {error.message}
                    </li>
                  ))}
                  {validationErrors.length > 3 && (
                    <li>...and {validationErrors.length - 3} more issues</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
