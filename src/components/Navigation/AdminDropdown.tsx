"use client";

import { useState, useRef, useEffect, useId, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { House, LayoutDashboard, Package, TrendingUp, Users, Terminal, LifeBuoy, ShieldAlert } from "lucide-react";
import { KandyAdminMenuSurface } from "@/components/creative-tim/kandydrops/navigation/KandyAdminMenuSurface";

export function AdminDropdown() {
    const { logout, userProfile, loading } = useAuth();
    const pathname = usePathname();
    const authSettled = !loading;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    // Strict Admin Check
    const isAdmin = userProfile?.role === "admin";

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

    if (!authSettled || !isAdmin) return null;

    const navItems = [
        { label: "Home", href: "/", icon: House },
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
        { label: "Drops", href: "/admin/drops", icon: Package },
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Support", href: "/admin/support", icon: LifeBuoy },
        { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
        { label: "Debug Console", href: "/admin/debug", icon: Terminal },
    ];

    return (
        <KandyAdminMenuSurface
            containerRef={dropdownRef}
            triggerRef={triggerRef}
            menuRef={menuRef}
            menuId={menuId}
            isOpen={isOpen}
            pathname={pathname}
            navigationItems={navItems}
            onToggle={() => setIsOpen((current) => !current)}
            onMenuKeyDown={handleMenuNavigation}
            onNavigate={() => setIsOpen(false)}
            onLogout={() => {
                logout();
                setIsOpen(false);
            }}
        />
    );
}
