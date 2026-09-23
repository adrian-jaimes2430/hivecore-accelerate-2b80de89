import marelAvatarAsset from "@/assets/marel-avatar-new.png.asset.json";

type MarelAvatarProps = {
  className?: string;
  decorative?: boolean;
  size?: number;
};

export const marelAvatarUrl = marelAvatarAsset.url;

export function MarelAvatar({ className, decorative = false, size = 512 }: MarelAvatarProps) {
  return (
    <img
      src={marelAvatarUrl}
      alt={decorative ? "" : "Marel"}
      width={size}
      height={size}
      loading="lazy"
      className={className}
    />
  );
}

export function MarelNavIcon({ className }: { className?: string }) {
  return (
    <span className={`marel-nav-icon ${className ?? ""}`} aria-hidden="true">
      <img src={marelAvatarUrl} alt="" />
    </span>
  );
}