import { ReactNode } from "react";

const titleHeight = 32;

type TileProps = {
  title?: string;
  children?: ReactNode;
  className?: string;
  childrenClassName?: string;
  padding?: boolean;
  backgroundColor?: string;
};

export const Tile: React.FC<TileProps> = ({
  children,
  title,
  className,
  childrenClassName,
  padding = true,
  backgroundColor = "transparent",
}) => {
  const contentPadding = padding ? 4 : 0;
  return (
    <div
      className={`flex flex-col text-black bg-${backgroundColor} ${className}`}
    >
      <div
        className={`flex flex-col items-center grow w-full ${
          childrenClassName ?? ""
        }`}
        style={{
          height: `calc(100% - ${title ? titleHeight + "px" : "0px"})`,
          padding: `${contentPadding * 4}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
