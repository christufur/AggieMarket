import * as React from "react";
import * as TabsPrimitive from "@rn-primitives/tabs";
import { cn } from "@/lib/utils";
import { TextClassContext } from "./text";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex-row h-12 items-center justify-center rounded-lg bg-muted p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { value } = TabsPrimitive.useRootContext();
  const isActive = value === props.value;
  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm font-medium",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          "flex-1 items-center justify-center rounded-md px-3 py-1.5",
          isActive && "bg-card shadow-sm",
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsContent, TabsList, TabsTrigger };
