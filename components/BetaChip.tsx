// 「內測」小標籤 — 用於主介面各頁 header,跟登入頁一致
export function BetaChip({ className = '' }: { className?: string }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium tracking-wider ${className}`}
    >
      內測
    </span>
  );
}
