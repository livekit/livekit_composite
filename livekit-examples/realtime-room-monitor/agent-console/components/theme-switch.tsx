"use client";

import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId } from "react";

export function ThemeSwitch() {
  const id = useId();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <div
      className="group inline-flex items-center gap-2 pr-3.5"
      data-state={theme === "dark" ? "checked" : "unchecked"}
    >
      <span
        id={`${id}-off`}
        className="flex-1 cursor-pointer text-right text-sm font-medium group-data-[state=checked]:text-muted-foreground/70"
        aria-controls={id}
        onClick={toggleTheme}
      >
        <Moon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <Switch
        id={id}
        checked={!isDark}
        onCheckedChange={toggleTheme}
        aria-labelledby={`${id}-off ${id}-on`}
        aria-label="Toggle between dark and light mode"
      />
      <span
        id={`${id}-on`}
        className="flex-1 cursor-pointer text-left text-sm font-medium group-data-[state=unchecked]:text-muted-foreground/70"
        aria-controls={id}
        onClick={toggleTheme}
      >
        <Sun size={16} strokeWidth={2} aria-hidden="true" />
      </span>
    </div>
  );
}
