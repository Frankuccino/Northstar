"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

function Popover({ ...props }: BasePopover.Root.Props) {
  return <BasePopover.Root data-slot="popover" {...props} />;
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  if (asChild && typeof children === "object" && children !== null && "type" in children) {
    return (
      <BasePopover.Trigger data-slot="popover-trigger" render={children as any} />
    );
  }

  return (
    <BasePopover.Trigger data-slot="popover-trigger">
      {children}
    </BasePopover.Trigger>
  );
}

function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: BasePopover.Popup.Props &
  Pick<
    BasePopover.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-72 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
