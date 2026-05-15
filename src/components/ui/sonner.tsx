import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-[#E8B968] group-[.toaster]:rounded-2xl group-[.toaster]:shadow-[0_5px_0_0_#E8B968] group-[.toaster]:font-semibold",
          description: "group-[.toast]:text-foreground/70 group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-[#FF6A1F] group-[.toast]:text-white group-[.toast]:font-extrabold group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-[#FFF1D6] group-[.toast]:text-foreground group-[.toast]:font-extrabold group-[.toast]:rounded-lg",
          success: "group-[.toaster]:border-[#0E8A4B] group-[.toaster]:shadow-[0_5px_0_0_#0A6E3C]",
          error: "group-[.toaster]:border-[#D4308E] group-[.toaster]:shadow-[0_5px_0_0_#A11A6A]",
          warning: "group-[.toaster]:border-[#FFD23F] group-[.toaster]:shadow-[0_5px_0_0_#E8B400]",
          info: "group-[.toaster]:border-[#3C50E0] group-[.toaster]:shadow-[0_5px_0_0_#2533A8]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
