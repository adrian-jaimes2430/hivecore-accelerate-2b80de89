import logo from "@/assets/hivecore-logo.png";

export function HiveLogo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full bg-hive/30 blur-md"
          style={{ width: size, height: size }}
        />
        <img
          src={logo}
          alt="HIVECORE"
          width={size}
          height={size}
          className="relative rounded-full"
        />
      </div>
      {withText && (
        <span
          className="font-display text-lg font-bold tracking-tight"
          style={{ letterSpacing: "0.02em" }}
        >
          HIVE<span className="text-hive">CORE</span>
        </span>
      )}
    </div>
  );
}
