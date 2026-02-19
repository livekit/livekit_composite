"use client";

import { Button } from "@/components/ui/button";
import { Rocket, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { usePlaygroundState } from "@/hooks/use-playground-state";
import { playgroundStateHelpers } from "@/lib/playground-state-helpers";
import SyntaxHighlighter from "react-syntax-highlighter";
import { irBlack as theme } from "react-syntax-highlighter/dist/esm/styles/hljs";

export function CodeViewer() {
  const [copied, setCopied] = useState(false);
  const { pgState } = usePlaygroundState();
  const fullInstructions = playgroundStateHelpers.getFullInstructions(pgState);

  const formatInstructions = (
    instructions: string,
    maxLineLength: number = 80
  ): string => {
    // For Python triple-quoted strings: escape backslashes, then double quotes
    const escaped = instructions.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    return escaped
      .split(/\s+/)
      .reduce(
        (lines, word) => {
          if ((lines[lines.length - 1] + " " + word).length <= maxLineLength) {
            lines[lines.length - 1] +=
              (lines[lines.length - 1] ? " " : "") + word;
          } else {
            lines.push(word);
          }
          return lines;
        },
        [""]
      )
      .join("\n");
  };

  const pythonCode = `from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import xai

async def entrypoint(ctx: JobContext):
    await ctx.connect()

    session = AgentSession(
        llm=xai.RealtimeModel(
            voice="${pgState.sessionConfig.voice}",
        )
    )

    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions="""${formatInstructions(fullInstructions)}"""
        )
    )

    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )

${
  pgState.sessionConfig.grokImageEnabled
    ? `
# Image generation is enabled in this playground!
# To add image generation to your agent, see the full implementation:
# https://github.com/livekit-examples/grok-playground/blob/main/agent/main.py
# 
# Key concepts:
# 1. Define function tools for the agent to call
# 2. Use xAI's Grok image generation API
# 3. Use LiveKit's stream_bytes to send images to the frontend
# 4. Receive byte streams on the frontend with registerByteStreamHandler
# 
# Learn more:
# - Grok Imagine: https://docs.x.ai/docs/guides/image-generation
# - Function Tools: https://docs.livekit.io/agents/tools/
`
    : `
# Note: This example doesn't include image generation.
# The Grok playground supports image generation via the "Grok Imagine" toggle.
# Source code (Python example) available at: https://github.com/livekit-examples/grok-playground/blob/main/agent/main.py
# 
# To learn how to add custom tools and byte stream communication:
# - Grok Imagine: https://docs.x.ai/docs/guides/image-generation
# - Function Tools: https://docs.livekit.io/agents/tools/
`
}

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary" className="relative">
          <Rocket className="h-5 w-5" />
          <span className="sm:ml-2 hidden sm:block">Build with LiveKit</span>
          <span className="ml-2 sm:hidden">Build</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl w-[90vw] sm:w-[95vw] flex flex-col mx-auto h-[85vh] sm:h-[90vh] max-h-[90vh] gap-0 p-0">
        <div className="flex flex-col border-b border-separator1 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <DialogHeader className="space-y-2 flex-1">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-fg0">
                Build your own AI Agent with LiveKit &amp; Grok
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-fg2">
                Use the starter code below with{" "}
                <a
                  className="underline hover:text-fg1 transition-colors"
                  href="https://github.com/livekit/agents"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LiveKit Agents
                </a>{" "}
                to get started with the Grok Voice Agent API.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
          <div className="relative flex-1 overflow-hidden group">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg text-xs sm:text-sm"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
            <div className="h-full overflow-auto [&>pre]:!m-0 [&>pre]:!p-4 sm:[&>pre]:!p-6 [&>pre]:!bg-[#000000] [&>pre]:h-full">
              <SyntaxHighlighter
                language="python"
                style={theme}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  background: "#000000",
                }}
              >
                {pythonCode}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-separator1 px-4 sm:px-6 py-4 bg-bg1">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<ArrowUpRight />}
            onClick={() =>
              window.open(
                "https://docs.livekit.io/agents",
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="w-full sm:w-auto"
          >
            Get building!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
