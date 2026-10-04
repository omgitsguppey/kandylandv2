import { ChatExperience } from "@/components/Chat/ChatExperience";

export const dynamic = "force-dynamic";

export default function DashboardChatPage() {
    return (
        <div className="relative z-30 flex min-h-0 w-full flex-1 flex-col bg-slate-950 md:static md:z-auto">
            <ChatExperience />
        </div>
    );
}
