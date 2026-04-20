import { ChatExperience } from "@/components/Chat/ChatExperience";

export const dynamic = "force-dynamic";

export default function DashboardChatPage() {
    return (
        <div className="relative z-30 flex min-h-0 flex-1 flex-col w-full bg-black md:static md:z-auto">
            <ChatExperience />
        </div>
    );
}
