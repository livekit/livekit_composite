"use client";

import React, { useEffect } from "react";
import { usePlaygroundState } from "@/hooks/use-playground-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ellipsisMiddle } from "@/lib/utils";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const AuthFormSchema = z.object({
  xaiAPIKey: z.string().min(1, { message: "API key is required" }),
});

export function Auth() {
  const { pgState, dispatch, showAuthDialog, setShowAuthDialog } =
    usePlaygroundState();

  const onLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch({ type: "SET_API_KEY", payload: null });
    setShowAuthDialog(true);
  };

  return (
    <div>
      {pgState.xaiAPIKey && (
        <div className="text-xs flex gap-2 items-center">
          <span className="font-medium text-fg2">Using xAI API Key</span>
          <div className="py-1 px-2 rounded-md bg-bg3 text-fg1 font-mono">
            {ellipsisMiddle(pgState.xaiAPIKey, 4, 4)}
          </div>
          <a
            className="text-fg2 hover:text-fgAccent1 transition-colors cursor-pointer"
            onClick={onLogout}
          >
            Clear
          </a>
        </div>
      )}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthComplete={() => setShowAuthDialog(false)}
      />
    </div>
  );
}

export function AuthDialog({
  open,
  onOpenChange,
  onAuthComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthComplete: () => void;
}) {
  const { pgState, dispatch } = usePlaygroundState();
  const form = useForm<z.infer<typeof AuthFormSchema>>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: {
      xaiAPIKey: pgState.xaiAPIKey || "",
    },
  });

  // Add this useEffect hook to watch for changes in pgState.xaiAPIKey
  useEffect(() => {
    form.setValue("xaiAPIKey", pgState.xaiAPIKey || "");
  }, [pgState.xaiAPIKey, form]);

  function onSubmit(values: z.infer<typeof AuthFormSchema>) {
    dispatch({ type: "SET_API_KEY", payload: values.xaiAPIKey || null });
    onOpenChange(false);
    onAuthComplete();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto">
          {/* Header with tab-style title */}
          <div className="flex h-[42px] w-full bg-bg1 px-6 border-b border-separator1">
            <div className="translate-y-px px-1 pb-0.5 font-semibold text-fg0 border-b-2 border-b-fgAccent1 flex items-center">
              API Key Setup
            </div>
          </div>

          <div className="px-6 pb-6 pt-6 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-fg1">
                    Try out xAI&apos;s Grok Voice Agent API right from your
                    browser with this playground built on{" "}
                    <Link
                      href="https://github.com/livekit/agents"
                      target="_blank"
                      className="underline text-fgAccent1 hover:text-fgAccent1/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LiveKit Agents
                    </Link>
                    .
                  </p>
                  <p className="text-sm text-fg1">
                    You must have a valid{" "}
                    <Link
                      href="https://console.x.ai/"
                      target="_blank"
                      className="underline text-fg0 hover:text-fgAccent1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      xAI API key
                    </Link>{" "}
                    to connect the playground to your xAI account.
                  </p>
                </div>
                <div className="h-[1px] w-full bg-separator1" />
                <FormField
                  control={form.control}
                  name="xaiAPIKey"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-col gap-2">
                        <FormLabel className="font-medium text-sm text-fg0">
                          Enter your{" "}
                          <Link
                            href="https://console.x.ai/"
                            target="_blank"
                            className="inline-flex items-center text-fg0 hover:text-fgAccent1 underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            xAI API Key
                            <ArrowUpRight className="h-4 w-4 ml-1" />
                          </Link>
                        </FormLabel>
                        <div className="flex gap-2 w-full items-center">
                          <FormControl className="w-full">
                            <Input
                              className="w-full h-10"
                              placeholder="xai-..."
                              {...field}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmit)();
                                }
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="primary"
                            className="h-10"
                            onClick={(e) => {
                              e.preventDefault();
                              onSubmit(form.getValues());
                            }}
                          >
                            Connect
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-xs text-fg2 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-3.5 w-3.5 flex-shrink-0 text-fg2" />
                    <span>
                      Your key is stored only in your browser&apos;s
                      LocalStorage.
                    </span>
                  </div>

                  <a
                    href="https://github.com/livekit-examples/grok-playground"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-fg1 hover:text-fgAccent1 transition-colors"
                  >
                    <GitHubLogoIcon className="h-4 w-4" />
                    <span>View source on GitHub</span>
                  </a>
                </div>
              </form>
            </Form>
          </div>
          <div className="h-[45vh] sm:h-0"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
