import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/40 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        "default":
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
        "destructive":
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:bg-destructive/80",
        "outline":
          "border-[1.5px] border-input bg-card text-muted-foreground font-medium hover:border-primary hover:bg-secondary hover:text-secondary-foreground dark:bg-input/30 dark:hover:bg-input/50",
        "outline-primary":
          "border-[1.5px] border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        "outline-destructive":
          "border-[1.5px] border-destructive text-destructive bg-transparent hover:bg-destructive hover:text-white focus-visible:ring-destructive/30",
        "emphasis":
          "bg-emphasis text-emphasis-foreground shadow-sm hover:bg-emphasis/85",
        "secondary":
          "border-[1.5px] border-secondary-foreground/15 bg-secondary text-secondary-foreground hover:bg-secondary/70",
        "ghost":
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        "link": "text-link underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-[38px] px-[18px] has-[>svg]:px-3.5",
        "xs": "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        "sm": "h-[30px] rounded-md gap-1.5 px-3.5 text-[11px] has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        "lg": "h-10 px-6 has-[>svg]:px-4",
        "xl": "h-12 px-6 text-[15px]",
        "icon": "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
