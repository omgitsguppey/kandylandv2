import { ChatExperience } from "@/components/Chat/ChatExperience";

export const dynamic = "force-dynamic";

export default function DashboardChatPage() {
    return (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)_+_4.5rem)] top-20 z-30 bg-black md:static md:bottom-auto md:top-auto md:z-auto md:h-full md:w-full">
            <ChatExperience />
        </div>
    );
}
