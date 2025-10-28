'use client';

import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, Monitor } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const isCollapsed = state === "collapsed";

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme for determining the actual active theme (handles 'system' preference)
  const activeTheme = mounted ? resolvedTheme : undefined;

  // When collapsed, show icon button with popover
  if (isCollapsed) {
    const getThemeIcon = () => {
      if (!mounted) {
        // Show a neutral icon during SSR/hydration
        return <Monitor className="h-4 w-4" />;
      }
      
      switch (activeTheme) {
        case 'light':
          return <Sun className="h-4 w-4" />;
        case 'dark':
          return <Moon className="h-4 w-4" />;
        default:
          return <Monitor className="h-4 w-4" />;
      }
    };

    return (
      <div className="relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              aria-label={`Current theme: ${mounted ? activeTheme || 'system' : 'loading'}. Click to change theme.`}
            >
              {getThemeIcon()}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-48"
            aria-label="Theme selection menu"
          >
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Theme</h4>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setTheme('light')}
                  aria-label="Switch to light theme"
                  data-active={theme === 'light'}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setTheme('dark')}
                  aria-label="Switch to dark theme"
                  data-active={theme === 'dark'}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setTheme('system')}
                  aria-label="Use system theme preference"
                  data-active={theme === 'system'}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // When expanded, show the full select dropdown
  // Show a loading state during SSR/hydration
  if (!mounted) {
    return (
      <div className="w-full h-9 bg-muted animate-pulse rounded-md" aria-label="Loading theme selector" />
    );
  }

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger 
        className="w-full" 
        variant="primary" 
        size="md"
        aria-label="Select theme"
      >
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
