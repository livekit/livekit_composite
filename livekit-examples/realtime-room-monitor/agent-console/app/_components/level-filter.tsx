import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export const LevelFilter = ({
  displayInfo,
  displayWarn,
  displayError,
  setDisplayInfo,
  setDisplayWarn,
  setDisplayError,
  numSelectedLevels,
}: {
  numSelectedLevels: number;
  displayInfo: boolean;
  displayWarn: boolean;
  displayError: boolean;
  setDisplayInfo: (checked: boolean) => void;
  setDisplayWarn: (checked: boolean) => void;
  setDisplayError: (checked: boolean) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span>Levels</span>
          <span className="text-muted-foreground/70">
            ({numSelectedLevels === 3 ? "All" : numSelectedLevels})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuCheckboxItem
          checked={displayInfo && displayWarn && displayError}
          onCheckedChange={(checked) => {
            setDisplayInfo(checked);
            setDisplayWarn(checked);
            setDisplayError(checked);
          }}
          onSelect={(e) => e.preventDefault()}
        >
          All Levels
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={displayInfo}
          onCheckedChange={setDisplayInfo}
          onSelect={(e) => e.preventDefault()}
        >
          <Info className="h-4 w-4 mr-2 text-blue-500" />
          Info
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={displayWarn}
          onCheckedChange={setDisplayWarn}
          onSelect={(e) => e.preventDefault()}
        >
          <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
          Warning
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={displayError}
          onCheckedChange={setDisplayError}
          onSelect={(e) => e.preventDefault()}
        >
          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
          Error
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
