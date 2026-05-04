import * as React from "react";
import { Modal, Pressable, View, useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";
import { TextClassContext } from "./text";

type DialogContextType = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextType>({
  open: false,
  onOpenChange: () => {},
});

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Pressable>) {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <Pressable
      className={cn(className)}
      onPress={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </Pressable>
  );
}

function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, onOpenChange } = React.useContext(DialogContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== "web" || width < 640;
  return (
    <Modal visible={open} transparent={!isMobile} animationType={isMobile ? "slide" : "fade"} presentationStyle={isMobile ? "fullScreen" : undefined}>
      <Pressable
        className={isMobile ? "flex-1 bg-card" : "flex-1 bg-black/50 justify-center items-center"}
        onPress={isMobile ? undefined : () => onOpenChange(false)}
      >
        <Pressable
          className={cn(
            isMobile
              ? "bg-card flex-1 w-full"
              : "bg-card rounded-xl p-6 mx-4 w-full max-w-md shadow-lg",
            className
          )}
          onPress={(e) => e.stopPropagation()}
          style={
            isMobile
              ? { flex: 1, width: "100%" as any, paddingTop: insets.top, paddingBottom: insets.bottom }
              : undefined
          }
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("flex flex-col gap-1.5 mb-4", className)}>
      {children}
    </View>
  );
}

function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TextClassContext.Provider
      value={cn("text-lg font-semibold text-foreground", className)}
    >
      {children}
    </TextClassContext.Provider>
  );
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("flex-row justify-end gap-2 mt-4", className)}>
      {children}
    </View>
  );
}

export {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
