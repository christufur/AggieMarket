import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, ...props }, ref) => (
  <TextInput
    ref={ref}
    multiline
    textAlignVertical="top"
    className={cn(
      "min-h-[100px] rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground",
      className
    )}
    placeholderTextColor="#9CA3AF"
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
