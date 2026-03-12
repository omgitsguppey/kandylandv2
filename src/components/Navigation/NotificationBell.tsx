"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useAuthIdentity } from "@/context/AuthContext";
import { User } from "firebase/auth";

interface NotificationNote {
    id: string;
    title: string;
    message: string;
    type: string;
    readBy?: string[];
    createdAt?: { toDate: () => Date };
    dropContext?: {
        previewImageUrl?: string;
        dropTitle?: string;
    };
}

import { useRouter } from "next/navigation";

function NotificationItem({ note, user, markAsRead, closeDropdown }: { note: NotificationNote; user: User | null; markAsRead: (id: string) => void; closeDropdown: () => void }) {
    // Notifications are only unread now due to the filtering logic, but we keep this for safety
    const isUnread = true;
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="w-4 h-4 text-brand-purple" />;
            case "warning": return <AlertTriangle className="w-4 h-4 text-brand-purple" />;
            case "error": return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-brand-purple" />;
        }
    };

    const handleContainerClick = () => {
        if (!isExpanded) {
            setIsExpanded(true);
        } else if (note.dropContext) {
            // Take to drops page if it has a drop context and is expanded
            router.push('/drops');
            closeDropdown();
        } else {
            setIsExpanded(false);
        }
    };

    return (
        <div
            onClick={handleContainerClick}
            className={cn(
                "rounded-lg transition-colors border overflow-hidden cursor-pointer",
                isUnread
                    ? "bg-white/[0.06] border-white/15 hover:bg-white/[0.08]"
                    : "bg-black/30 border-white/5"
            )}
        >
            <div className="px-3 py-2.5 flex gap-3 items-start">
                <div className="mt-0.5 shrink-0">
                    {getIcon(note.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white leading-tight">{note.title}</p>
                        {isUnread && (
                            <button
                                onClick={(e) => { e.stopPropagation(); markAsRead(note.id); }}
                                className="text-[10px] font-bold text-brand-purple shrink-0 hover:text-white transition-colors bg-brand-purple/10 px-2 py-1 rounded-full flex items-center gap-1"
                                title="Mark as read"
                            >
                                <Check className="w-2.5 h-2.5" /> Read
                            </button>
                        )}
                    </div>

                    <p className="text-[10px] text-gray-500 mt-1 font-mono">
                        {note.createdAt?.toDate ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                    </p>

                    {isExpanded && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                            <p className="text-xs text-gray-400 leading-snug">
                                {note.message}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {note.dropContext && isExpanded && (
                <div 
                    className="border-t border-white/5 bg-black/40 px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); router.push('/drops'); }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10 shrink-0 bg-black flex items-center justify-center">
                            {note.dropContext.previewImageUrl ? (
                                <Image
                                    src={note.dropContext.previewImageUrl}
                                    alt={note.dropContext.dropTitle || "Drop Preview"}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                />
                            ) : (
                                <span className="text-xs">🍬</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-wider text-brand-purple font-bold">View Drop</p>
                            <p className="text-xs text-white font-medium truncate">{note.dropContext.dropTitle}</p>
                        </div>
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
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-brand-purple rounded-full border border-white/20 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg transition-transform duration-300 scale-in-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            <div
                className={cn(
                    "absolute right-0 top-full mt-3 w-72 md:w-80 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden origin-top-right transition-all duration-200 z-50 flex flex-col max-h-[400px]",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
                style={{ WebkitBackdropFilter: "blur(30px)" }}
            >
                <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                    <h3 className="font-bold text-white text-xs tracking-wide">Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-[10px] text-brand-purple transition-colors font-bold flex items-center gap-1 hover:text-white bg-brand-purple/10 px-2 py-0.5 rounded-full"
                        >
                            <Check className="w-2.5 h-2.5" /> Mark all read
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-1.5 space-y-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-xs">
                            <Bell className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((note) => (
                            <NotificationItem
                                key={note.id}
                                note={note as NotificationNote}
                                user={user}
                                markAsRead={markAsRead}
                                closeDropdown={() => setIsOpen(false)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
