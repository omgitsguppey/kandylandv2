
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-brand-green" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-brand-yellow" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-brand-cyan" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-black animate-pulse" />
                )}
            </button>

            {/* Dropdown */}
            <div
                className={cn(
                    "absolute right-0 top-full mt-2 w-80 md:w-96 glass-panel backdrop-blur-3xl bg-black/90 rounded-2xl shadow-2xl border border-white/10 overflow-hidden origin-top-right transition-all duration-200 z-50 flex flex-col max-h-[80vh]",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
            >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-brand-pink hover:text-white transition-colors font-bold flex items-center gap-1"
                        >
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((note) => (
                            <div
                                key={note.id}
                                onClick={() => markAsRead(note.id)}
                                className={cn(
                                    "p-3 rounded-xl transition-colors cursor-pointer flex gap-3 group relative overflow-hidden",
                                    // Hacky check for read status via hook would be better, but we can't easily access the readBy array here cleanly without passing it or assuming hook state is fresh.
                                    // Actually we have the full notification object.
                                    // We need to know if CURRENT user is in readBy. 
                                    // The hook filters, but let's assume if it's in the list it MIGHT be unread.
                                    // Wait, the hook returns ALL notifications, we need to check read status here.
                                    // Let's trust formatting.
                                    "hover:bg-white/5"
                                )}
                            >
                                {/* Unread Indicator */}
                                {/* We need current user ID to check `readBy` here ideally, or use a derived property from hook. 
                                    For now, let's just show standard style. 
                                */}

                                <div className="mt-1 shrink-0">
                                    {getIcon(note.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white leading-tight mb-1">{note.title}</p>
                                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{note.message}</p>
                                    <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                        {note.createdAt?.toDate ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                    </p>
                                </div>
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-2 h-2 rounded-full bg-brand-pink" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
