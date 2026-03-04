"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useAuthIdentity } from "@/context/AuthContext";

function NotificationItem({ note, user, markAsRead }: { note: any, user: any, markAsRead: (id: string) => void }) {
    const isUnread = user ? !(note.readBy || []).includes(user.uid) : false;
    const [isExpanded, setIsExpanded] = useState(false);

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="w-3.5 h-3.5 text-brand-purple" />;
            case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-brand-purple" />;
            case "error": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
            default: return <Info className="w-3.5 h-3.5 text-brand-purple" />;
        }
    };

    return (
        <div
            className={cn(
                "rounded-xl transition-colors border overflow-hidden",
                isUnread
                    ? "bg-white/5 border-white/20"
                    : "bg-black/40 border-white/5"
            )}
        >
            <div className="p-2.5 flex gap-2.5 items-start">
                <div className="mt-0.5 shrink-0">
                    {getIcon(note.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-white leading-tight mb-0.5">{note.title}</p>
                        {isUnread && (
                            <button
                                onClick={(e) => { e.stopPropagation(); markAsRead(note.id); }}
                                className="text-[9px] font-bold text-brand-purple shrink-0 hover:text-white transition-colors bg-brand-purple/10 px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                title="Mark as read"
                            >
                                <Check className="w-2.5 h-2.5" /> Read
                            </button>
                        )}
                    </div>

                    <div
                        className="cursor-pointer group"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <p className={cn(
                            "text-[11px] text-gray-300 leading-snug transition-all",
                            !isExpanded && "line-clamp-2"
                        )}>
                            {note.message}
                        </p>
                        {note.message && note.message.length > 80 && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-500 group-hover:text-gray-300 transition-colors">
                                {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                            </div>
                        )}
                    </div>

                    <p className="text-[9px] text-gray-500 mt-1.5 font-mono">
                        {note.createdAt?.toDate ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                    </p>
                </div>
            </div>

            {note.dropContext && (
                <div className="border-t border-white/5 bg-black/50 px-2.5 py-2 flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black flex items-center justify-center">
                        {note.dropContext.previewImageUrl ? (
                            <Image
                                src={note.dropContext.previewImageUrl}
                                alt={note.dropContext.dropTitle || "Drop Preview"}
                                fill
                                sizes="32px"
                                className="object-cover"
                            />
                        ) : (
                            <span className="text-sm">🍬</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-gray-500">Drop Preview</p>
                        <p className="text-[11px] text-white font-medium truncate">{note.dropContext.dropTitle}</p>
                    </div>
                </div>
            )}
        </div>
    );
}


export function NotificationBell() {
    const { user } = useAuthIdentity();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors text-gray-300 hover:text-white bg-black/20 hover:bg-black/40"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-purple rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black text-white px-1 shadow-sm transition-transform duration-300 scale-in-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            <div
                className={cn(
                    "absolute right-0 top-full mt-3 w-80 md:w-96 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden origin-top-right transition-all duration-200 z-50 flex flex-col max-h-[85vh]",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
                style={{ WebkitBackdropFilter: "blur(24px)" }}
            >
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-white text-[13px] tracking-wide">Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-[11px] text-brand-purple transition-colors font-bold flex items-center gap-1 hover:text-white bg-brand-purple/10 px-2 py-1 rounded-full"
                        >
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((note) => (
                            <NotificationItem
                                key={note.id}
                                note={note}
                                user={user}
                                markAsRead={markAsRead}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
