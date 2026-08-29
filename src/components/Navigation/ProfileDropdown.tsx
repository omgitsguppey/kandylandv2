"use client";

import { useState, useRef, useEffect, useId, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { LayoutDashboard, Library, Settings, CircleHelp, LifeBuoy, FileText, MessageSquare, Sparkles } from "lucide-react";

import { useAuth, useUserProfile } from "@/context/AuthContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { CREATOR_DASHBOARD_ROUTE, CREATOR_SETTINGS_ROUTE, USER_LIBRARY_ROUTE, USER_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import {
    KandyProfileMenuSurface,
    type KandyProfileMenuSection,
} from "@/components/creative-tim/kandydrops/navigation/KandyProfileMenuSurface";

export function ProfileDropdown() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const { userProfile } = useUserProfile();
    const { hasUnreadMessages } = useChatUnreadStatus();
    const isAdmin = userProfile?.role === "admin";
    const isCreatorAccount = userProfile?.role === "creator" || isAdmin;

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

    useEffect(() => {
        if (!isOpen) return;

        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

        function handleMenuKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        }

        document.addEventListener("keydown", handleMenuKeyDown);
        return () => document.removeEventListener("keydown", handleMenuKeyDown);
    }, [isOpen]);

    function handleMenuNavigation(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;

        event.preventDefault();
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        const targetIndex = event.key === "Home"
            ? 0
            : event.key === "End"
                ? items.length - 1
                : event.key === "ArrowUp"
                    ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
                    : (currentIndex + 1) % items.length;
        items[targetIndex]?.focus();
    }

    if (!user) return null;

    const displayName = typeof user.displayName === "string" && user.displayName.trim().length > 0 ? user.displayName : "User";
    const username = typeof userProfile?.username === "string" && userProfile.username.trim().length > 0 ? userProfile.username.trim() : "";
    const primaryIdentity = username ? `@${username}` : displayName;
    const secondaryIdentity = username && displayName !== username
        ? displayName
        : typeof user.email === "string" && user.email.trim().length > 0
            ? user.email
            : "Manage account";
    const avatarUrl = typeof user.photoURL === "string" && user.photoURL.trim().length > 0 ? user.photoURL : null;

    const navigationSections: KandyProfileMenuSection[] = [
        {
            label: "Your Kandy",
            layout: "primary",
            items: [
                { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                { href: "/dashboard/chat", icon: MessageSquare, label: "Chat", hasUnreadIndicator: hasUnreadMessages },
                { href: USER_LIBRARY_ROUTE, icon: Library, label: "KandyDrops" },
            ],
        },
        ...(isCreatorAccount ? [{
            label: "Creator space",
            layout: "feature" as const,
            items: [
                { href: CREATOR_DASHBOARD_ROUTE, icon: Sparkles, label: "Studio" },
                { href: CREATOR_SETTINGS_ROUTE, icon: Settings, label: "Creator settings" },
            ],
        }] : []),
        {
            label: "Account care",
            layout: "utility",
            items: [
                { href: USER_SETTINGS_ROUTE, icon: Settings, label: "Settings" },
                { href: "/dashboard/support", icon: LifeBuoy, label: "Support" },
                { href: "/faq", icon: CircleHelp, label: "FAQ" },
                { href: "/privacy", icon: FileText, label: "Privacy" },
            ],
        },
    ];

    const handleNavigation = (destination: string) => {
        trackEvent("navigation_click", { destination, source: "profile_dropdown" });
        setIsOpen(false);
    };

    return (
        <KandyProfileMenuSurface
            containerRef={dropdownRef}
            triggerRef={triggerRef}
            menuRef={menuRef}
            menuId={menuId}
            isOpen={isOpen}
            displayName={displayName}
            primaryIdentity={primaryIdentity}
            secondaryIdentity={secondaryIdentity}
            avatarUrl={avatarUrl}
            isAdmin={isAdmin}
            navigationSections={navigationSections}
            accountHref={USER_SETTINGS_ROUTE}
            onToggle={() => setIsOpen((current) => !current)}
            onMenuKeyDown={handleMenuNavigation}
            onNavigate={handleNavigation}
            onLogout={() => {
                logout();
                setIsOpen(false);
            }}
        />
    );
}
