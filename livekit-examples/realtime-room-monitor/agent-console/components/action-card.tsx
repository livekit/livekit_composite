import { JsonPreview } from "@/components/json-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";

type ActionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  action: () => Promise<object>;
  disabled?: boolean;
  className?: string;
};

export const ActionCard = ({
  title,
  description,
  children,
  action,
  disabled,
  className,
}: ActionCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<object | null>(null);

  const handleActionImpl = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await action();
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, [action]);

  const handleAction = useCallback(() => {
    toast.promise(handleActionImpl, {
      loading: "Processing...",
      success: "Action completed successfully",
      error: (error) => {
        console.error(error);
        return error instanceof Error ? error.message : "Action failed";
      },
    });
  }, [handleActionImpl]);

  return (
    <div className={cn("space-y-6 p-4 border rounded-lg bg-card shadow-md", className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        {children}

        <Button onClick={handleAction} disabled={disabled || isLoading} className="w-full">
          {isLoading ? "Processing..." : "Perform Action"}
        </Button>

        {response && (
          <div className="mt-4 space-y-2">
            <JsonPreview title="Response" data={response} />
          </div>
        )}
      </div>
    </div>
  );
};
