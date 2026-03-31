import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, ...props }, ref) => (
  <TextInput
    ref={ref}
    className={cn(
      "h-11 rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground",
      className
    )}
    placeholderTextColor="#9CA3AF"
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
