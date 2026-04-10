import type { Viewport } from "next";

import { ChatRouteShell } from "@/components/Chat/ChatRouteShell";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
};

export default function DashboardChatLayout({ children }: { children: React.ReactNode }) {
    return <ChatRouteShell>{children}</ChatRouteShell>;
}
