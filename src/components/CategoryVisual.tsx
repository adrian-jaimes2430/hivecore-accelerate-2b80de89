import {
  Crown,
  Flame,
  Gem,
  Gift,
  Heart,
  Rocket,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  FIRE: Flame,
  STAR: Star,
  BOLT: Zap,
  HEART: Heart,
  GIFT: Gift,
  CART: ShoppingCart,
  TAG: Tag,
  CROWN: Crown,
  SPARKLES: Sparkles,
  ROCKET: Rocket,
  TROPHY: Trophy,
  DIAMOND: Gem,
};

const TONES = new Set(["green", "orange", "red", "yellow", "blue", "purple", "pink", "cyan", "white", "gray"]);

export function categoryToneClass(color?: string | null) {
  const normalized = color?.toLowerCase() ?? "green";
  return `category-tone-${TONES.has(normalized) ? normalized : "green"}`;
}

export function CategoryIcon({ icon, color, className }: { icon?: string | null; color?: string | null; className?: string }) {
  const Icon = icon ? ICONS[icon.toUpperCase()] : undefined;
  if (!Icon) return null;
  return (
    <span className={cn("category-icon", categoryToneClass(color), className)} aria-hidden="true">
      <Icon />
    </span>
  );
}
