export function Skeleton({ width, height, borderRadius = 4 }: {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
}) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius,
        backgroundColor: "var(--pilot-surface-alt)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}
