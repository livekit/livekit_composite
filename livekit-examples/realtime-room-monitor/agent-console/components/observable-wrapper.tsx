import { JsonPreview } from "@/components/json-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDisplayJson } from "@/hooks/use-display-json";
import React from "react";

export const ObservableWrapper = <T extends object>({
  state,
  title,
  subtitle,
  children,
}: {
  state: T;
  title: string;
  subtitle?: string;
  children: (state: T) => React.ReactElement;
}) => {
  const { displayJson, setDisplayJson } = useDisplayJson();

  return (
    <Card className="w-full rounded-lg">
      <Tabs
        value={displayJson ? "json" : "view"}
        onValueChange={(value) => setDisplayJson(value === "json")}
      >
        <CardHeader className="pb-1">
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
              <TabsList>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TabsContent value="view">{children(state)}</TabsContent>
          <TabsContent value="json">
            <JsonPreview collapsed={3} displayDataTypes={false} data={state} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};
