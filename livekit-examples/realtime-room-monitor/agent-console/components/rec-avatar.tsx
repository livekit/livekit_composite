import { cn } from "@/lib/utils";

interface RecAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  isSpeaking: boolean;
  isSelected: boolean;
}

const colors = [
  "bg-blue-500",
  "bg-red-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
];

const getColorFromName = (name: string) => {
  const hash = name.split("").reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return colors[hash % colors.length];
};

export const RecAvatar = ({ name, isSpeaking, isSelected, ...props }: RecAvatarProps) => {
  return (
    <div className="relative" {...props}>
      <div
        className={cn(
          "rounded-lg overflow-hidden w-9 h-9 flex items-center justify-center",
          getColorFromName(name),
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <span className="text-white text-md font-semibold">{name.charAt(0).toUpperCase()}</span>
      </div>
      <span
        className={cn(
          "absolute -end-1 -top-1 size-3 rounded-full border-2 border-background",
          isSpeaking ? "bg-emerald-500" : "bg-red-500"
        )}
      >
        <span className="sr-only">Online</span>
      </span>
    </div>
  );
};
