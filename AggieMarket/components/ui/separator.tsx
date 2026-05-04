import * as React from "react";
import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type SeparatorProps = ViewProps & {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

const Separator = React.forwardRef<View, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative: _decorative = true, style, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      style={style}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
