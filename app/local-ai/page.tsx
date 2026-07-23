import { AiOmokGame } from "@/components/AiOmokGame";
import { GameShell } from "@/components/GameShell";
import { parseAiMode } from "@/lib/ai";

interface LocalAiPageProps {
  searchParams: Promise<{ difficulty?: string }>;
}

export default async function LocalAiPage({ searchParams }: LocalAiPageProps) {
  const params = await searchParams;
  const mode = parseAiMode(params.difficulty);

  return (
    <GameShell>
      <AiOmokGame initialMode={mode} />
    </GameShell>
  );
}
