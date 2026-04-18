import { ChatExperience } from "@/components/Chat/ChatExperience";

export const dynamic = "force-dynamic";

export default function DashboardChatPage() {
    return (
        <div className="relative z-30 h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] min-h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] bg-black md:static md:z-auto md:h-full md:min-h-0 md:w-full">
            <ChatExperience />
        </div>
    );
}
