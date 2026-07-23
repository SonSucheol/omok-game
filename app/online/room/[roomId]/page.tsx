import { OnlineOmokGame } from "@/components/OnlineOmokGame";
import { GameShell } from "@/components/GameShell";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function OnlineRoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return (
    <GameShell showLobby backHref="/online">
      <OnlineOmokGame roomId={roomId} />
    </GameShell>
  );
}
