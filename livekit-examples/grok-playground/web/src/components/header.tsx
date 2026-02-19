"use client";

import { CodeViewer } from "@/components/code-viewer";
import { PresetSave } from "@/components/preset-save";
import { PresetSelector } from "@/components/preset-selector";
import { PresetShare } from "@/components/preset-share";
import Image from "next/image";

export function Header() {
  return (
    <div className="flex flex-shrink-0 flex-col lg:flex-row p-4 rounded-t-md">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:flex-grow">
        <div className="flex flex-col mb-2 lg:mb-0">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/xAI_Logomark_Block_Light.svg"
                alt="xAI Logo"
                width={32}
                height={32}
                className="dark:hidden"
              />
              <Image
                src="/xAI_Logomark_Block_Dark.svg"
                alt="xAI Logo"
                width={32}
                height={32}
                className="hidden dark:block"
              />
              <div>
                <h2 className="text-lg font-semibold text-fg0">
                  Live API Playground
                </h2>
                <p className="text-sm text-fg2">
                  Try xAI&apos;s Grok Voice Agent API right from your browser.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between sm:justify-end space-x-2 mt-2 lg:mt-0">
          <div className="flex flex-row items-center space-x-2">
            <PresetSelector />
            <PresetSave />
            <PresetShare />
            <CodeViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
