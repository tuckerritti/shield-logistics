interface CardProps {
  card: string; // e.g., "Ah", "Kd", "7s", "3c"
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Card({ card, faceDown = false, size = "md" }: CardProps) {
  const sizeConfig = {
    sm: {
      container: "w-12 h-16",
      cornerRank: "text-xs",
      cornerSuit: "text-sm",
      centerSuit: "text-2xl",
      backIcon: "text-xl",
      padding: "p-0.5",
      border: "border-[1.5px]",
      rounded: "rounded-md",
    },
    md: {
      container: "w-16 h-24",
      cornerRank: "text-base",
      cornerSuit: "text-xl",
      centerSuit: "text-4xl",
      backIcon: "text-3xl",
      padding: "p-1",
      border: "border-2",
      rounded: "rounded-lg",
    },
    lg: {
      container: "w-20 h-28",
      cornerRank: "text-lg",
      cornerSuit: "text-2xl",
      centerSuit: "text-5xl",
      backIcon: "text-4xl",
      padding: "p-1.5",
      border: "border-2",
      rounded: "rounded-lg",
    },
  };

  const config = sizeConfig[size];

  if (faceDown) {
    return (
      <div
        className={`${config.container} ${config.rounded} ${config.border} border-gray-600 bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg`}
      >
        <div className="flex h-full items-center justify-center">
          <div className={`${config.backIcon} text-blue-300`}>🂠</div>
        </div>
      </div>
    );
  }

  // Safety check for null/undefined cards
  if (!card || card.length < 2) {
    console.error("Invalid card value:", card);
    return null;
  }

  const rank = card[0];
  const suit = card[1];

  const suitSymbols: Record<string, string> = {
    h: "♥",
    d: "♦",
    c: "♣",
    s: "♠",
  };

  const rankNames: Record<string, string> = {
    T: "10",
    J: "J",
    Q: "Q",
    K: "K",
    A: "A",
  };

  const isRed = suit === "h" || suit === "d";
  const displayRank = rankNames[rank] || rank;
  const suitSymbol = suitSymbols[suit];

  return (
    <div
      className={`${config.container} ${config.rounded} ${config.border} relative border-gray-300 bg-white shadow-lg transition-transform hover:scale-105`}
    >
      {/* Top left corner */}
      <div className={`absolute left-0 top-0 ${config.padding} font-bold leading-none ${isRed ? "text-red-600" : "text-black"}`}>
        <div className={`${config.cornerRank} leading-none`}>{displayRank}</div>
        <div className={`${config.cornerSuit} leading-none`}>{suitSymbol}</div>
      </div>

      {/* Center suit */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${config.centerSuit} ${isRed ? "text-red-600" : "text-black"}`}
      >
        {suitSymbol}
      </div>

      {/* Bottom right corner (rotated) */}
      <div
        className={`absolute right-0 bottom-0 ${config.padding} rotate-180 font-bold leading-none ${isRed ? "text-red-600" : "text-black"}`}
      >
        <div className={`${config.cornerRank} leading-none`}>{displayRank}</div>
        <div className={`${config.cornerSuit} leading-none`}>{suitSymbol}</div>
      </div>
    </div>
  );
}
