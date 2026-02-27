
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useAuthIdentity } from "@/context/AuthContext";

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

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="w-4 h-4 text-brand-green" />;
            case "warning": return <AlertTriangle className="w-4 h-4 text-brand-yellow" />;
            case "error": return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-brand-cyan" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors text-gray-300"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-black animate-pulse" />
                )}
            </button>

            <div
                className={cn(
                    "absolute right-0 top-full mt-2 w-80 md:w-96 bg-black/55 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-xl shadow-black/40 overflow-hidden origin-top-right transition-all duration-200 z-50 flex flex-col max-h-[80vh]",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
                style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-brand-pink transition-colors font-bold flex items-center gap-1"
                        >
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((note) => {
                            const isUnread = user ? !note.readBy.includes(user.uid) : false;
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => markAsRead(note.id)}
                                    className={cn(
                                        "rounded-2xl transition-colors cursor-pointer border overflow-hidden",
                                        isUnread
                                            ? "bg-white/10 border-white/20"
                                            : "bg-black/30 border-white/10"
                                    )}
                                >
                                    <div className="p-3 flex gap-3 items-start">
                                        <div className="mt-1 shrink-0">
                                            {getIcon(note.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-white leading-tight mb-1">{note.title}</p>
                                                {isUnread && <div className="w-2 h-2 rounded-full bg-brand-pink mt-1 shrink-0" />}
                                            </div>
                                            <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{note.message}</p>
                                            <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                                {note.createdAt?.toDate ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                                            </p>
                                        </div>
                                    </div>

                                    {note.dropContext && (
                                        <div className="border-t border-white/10 bg-black/30 px-3 py-2.5 flex items-center gap-3">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black">
                                                <Image
                                                    src={note.dropContext.previewImageUrl}
                                                    alt={note.dropContext.dropTitle}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Drop Preview</p>
                                                <p className="text-xs text-white font-semibold truncate">{note.dropContext.dropTitle}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
