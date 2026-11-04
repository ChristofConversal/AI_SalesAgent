import { notFound } from "next/navigation";
import MeetingView from "@/components/MeetingView";
import { meetingState } from "@/lib/meeting-state";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await meetingState(id);
  if (!state) notFound();
  return <MeetingView initial={state} />;
}
