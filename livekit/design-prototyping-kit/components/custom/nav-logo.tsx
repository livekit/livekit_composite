'use client';

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export function NavLogo() {
  const { toggleSidebar } = useSidebar();
  const metaKey = "Cmd"; // For macOS
  const shortcut = "B"; // Assuming uppercase for display

  return (
    <div className="flex h-8 items-center justify-between group-data-[state=expanded]:ml-3 group-data-[state=collapsed]:w-10">
      {/* Display only on expanded sidebar */}
      <div className="hidden w-full items-center justify-between group-data-[state=expanded]:flex">
        <svg
          width={78.45}
          height={18}
          role="img"
          aria-label="LiveKit wordmark"
          viewBox="0 0 123 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-foreground"
        >
          <path d="M4.6991 0H0V27.5637H17.0471V23.538H4.6991V0Z" fill="currentcolor" />
          <path d="M24.8042 12.5481H20.251V27.5623H24.8042V12.5481Z" fill="currentcolor" />
          <path
            d="M38.208 27.0184L32.4165 8.01392H27.8633L33.9465 27.5628H42.4695L48.5527 8.01392H43.9628L38.208 27.0184Z"
            fill="currentcolor"
          />
          <path
            d="M59.8485 7.58081C53.9468 7.58081 50.1953 11.7884 50.1953 17.7721C50.1953 23.7204 53.8377 28 59.8485 28C64.4374 28 67.7524 25.9688 68.9906 21.7979H64.3607C63.6692 23.6838 62.3931 24.8102 59.8798 24.8102C57.1116 24.8102 55.1818 22.8877 54.8177 19.1169H69.3148C69.3841 18.6362 69.4202 18.1513 69.4228 17.6656C69.4239 11.57 65.6357 7.58081 59.8485 7.58081ZM54.8534 15.9583C55.3277 12.4414 57.1851 10.7728 59.8485 10.7728C62.6524 10.7728 64.5465 12.8395 64.7659 15.9583H54.8534Z"
            fill="currentcolor"
          />
          <path
            d="M96.0485 0H90.1479L78.7108 12.6216V0H74.0117V27.5637H78.7108V13.6372L91.3138 27.5637H97.3235L84.1382 13.0562L96.0485 0Z"
            fill="currentcolor"
          />
          <path d="M103.914 8.01392H99.3604V23.0281H103.914V8.01392Z" fill="currentcolor" />
          <path d="M20.2515 8.01392H15.6982V12.5474H20.2515V8.01392Z" fill="currentcolor" />
          <path d="M108.468 23.03H103.915V27.5636H108.468V23.03Z" fill="currentcolor" />
          <path d="M122.074 23.03H117.521V27.5636H122.074V23.03Z" fill="currentcolor" />
          <path
            d="M122.073 12.5484V8.0149H117.52V0H112.966V8.0149H108.413V12.5484H112.966V23.0302H117.52V12.5484H122.073Z"
            fill="currentcolor"
          />
        </svg>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-8 w-10 text-muted-foreground opacity-0 transition-opacity group-data-[state=expanded]:group-hover:opacity-100"
              variant="ghost"
              onClick={toggleSidebar}
            >
              <ChevronLeftIcon className="size-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Collapse sidebar ({metaKey} + {shortcut})
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Display only on collapsed sidebar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="mx-auto hidden h-8 w-10 text-muted-foreground group-data-[state=collapsed]:group-hover:flex"
            variant="ghost"
            onClick={toggleSidebar}
          >
            <ChevronRightIcon className="size-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Expand sidebar ({metaKey} + {shortcut})
        </TooltipContent>
      </Tooltip>
      <svg
        width="20"
        height="20"
        viewBox="0 0 28 28"
        fill="none"
        role="img"
        aria-label="LiveKit logo"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto size-5 text-foreground group-data-[state=expanded]:hidden group-data-[state=collapsed]:group-hover:hidden"
      >
        <g className="text-fgAccent1">
          <path d="M16.8005 11.1995H11.1996V16.8003H16.8005V11.1995Z" fill="currentcolor" />
          <path d="M22.4013 5.60083H16.8004V11.2017H22.4013V5.60083Z" fill="currentcolor" />
          <path d="M22.4013 16.8005H16.8004V22.4014H22.4013V16.8005Z" fill="currentcolor" />
          <path d="M28 0H22.3991V5.60087H28V0Z" fill="currentcolor" />
          <path d="M28 22.3992H22.3991V28H28V22.3992Z" fill="currentcolor" />
        </g>
        <path
          d="M5.60088 22.3991V16.8004V11.1996V5.60088V0H0V5.60088V11.1996V16.8004V22.3991V28H5.60088H11.1996H16.8004V22.3991H11.1996H5.60088Z"
          fill="currentcolor"
        />
      </svg>
    </div>
  );
}
