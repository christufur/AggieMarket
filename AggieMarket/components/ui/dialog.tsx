import * as React from "react";
import { Modal, Pressable, View } from "react-native";
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
  return (
    <Modal visible={open} transparent animationType="fade">
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className={cn(
            "bg-card rounded-xl p-6 mx-4 w-full max-w-md shadow-lg",
            className
          )}
          onPress={(e) => e.stopPropagation()}
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
