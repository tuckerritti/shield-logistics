import { Card } from "./Card";

interface CommunityCardsProps {
  boardA: string[];
  boardB: string[];
  phase: string;
}

export function CommunityCards({ boardA, boardB }: CommunityCardsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Board A */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1 rounded-lg bg-black/20 p-2 backdrop-blur-sm">
          {boardA.filter((card) => card != null).map((card, index) => (
            <Card key={`a-${index}`} card={card} size="sm" />
          ))}
        </div>
      </div>

      {/* Board B */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1 rounded-lg bg-black/20 p-2 backdrop-blur-sm">
          {boardB.filter((card) => card != null).map((card, index) => (
            <Card key={`b-${index}`} card={card} size="sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
