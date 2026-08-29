"use client";

import { useEffect } from "react";
import {
  CircleHelp,
  FileText,
  LayoutDashboard,
  Library,
  LifeBuoy,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { useUI } from "@/context/UIContext";
import {
  CREATOR_DASHBOARD_ROUTE,
  CREATOR_SETTINGS_ROUTE,
  USER_LIBRARY_ROUTE,
  USER_SETTINGS_ROUTE,
} from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import {
  ProfileSidebarSurface,
  type ProfileSidebarNavigationSection,
} from "@/components/creative-tim/kandydrops/navigation/ProfileSidebarSurface";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSidebar({
  isOpen,
  onClose,
}: ProfileSidebarProps) {
  const { user, logout } = useAuthIdentity();
  const { userProfile } = useUserProfile();
  const { hasUnreadMessages } = useChatUnreadStatus();
  const { openPurchaseModal } = useUI();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!user || !isOpen) {
    return null;
  }

  const isAdmin = userProfile?.role === "admin";
  const isCreatorAccount = userProfile?.role === "creator" || isAdmin;
  const displayName =
    typeof user.displayName === "string" && user.displayName.trim()
      ? user.displayName.trim()
      : "User";
  const email =
    typeof user.email === "string" && user.email.trim()
      ? user.email.trim()
      : "No email";
  const username =
    typeof userProfile?.username === "string" && userProfile.username.trim()
      ? userProfile.username.trim()
      : "";
  const primaryIdentity = username ? `@${username}` : displayName;
  const secondaryIdentity =
    username && displayName !== username ? displayName : email;
  const profileInitial = displayName.charAt(0).toUpperCase();
  const avatarUrl =
    typeof user.photoURL === "string" && user.photoURL.trim()
      ? user.photoURL.trim()
      : null;
  const balanceCandidate = userProfile?.gumDropsBalance;
  const gumDropsBalance =
    typeof balanceCandidate === "number" && Number.isFinite(balanceCandidate)
      ? balanceCandidate
      : 0;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handlePurchase = () => {
    onClose();
    openPurchaseModal();
  };

  const handleNavigation = (destination: string) => {
    trackEvent("navigation_click", {
      destination,
      source: "profile_sidebar",
    });
    onClose();
  };

  const navigationSections: ProfileSidebarNavigationSection[] = [
    {
      label: "Your Kandy",
      items: [
        {
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          label: "Dashboard",
        },
        {
          href: "/dashboard/chat",
          icon: <MessageSquare className="h-5 w-5" />,
          label: "Messages",
          hasUnreadIndicator: hasUnreadMessages,
        },
        {
          href: USER_LIBRARY_ROUTE,
          icon: <Library className="h-5 w-5" />,
          label: "My KandyDrops",
        },
      ],
    },
    ...(isCreatorAccount
      ? [
          {
            label: "Creator tools",
            items: [
              {
                href: CREATOR_DASHBOARD_ROUTE,
                icon: <Sparkles className="h-5 w-5" />,
                label: "Creator dashboard",
              },
              {
                href: CREATOR_SETTINGS_ROUTE,
                icon: <Settings className="h-5 w-5" />,
                label: "Creator settings",
              },
            ],
          },
        ]
      : []),
    {
      label: "Account and help",
      items: [
        {
          href: USER_SETTINGS_ROUTE,
          icon: <Settings className="h-5 w-5" />,
          label: "Settings",
        },
        {
          href: "/faq",
          icon: <CircleHelp className="h-5 w-5" />,
          label: "FAQ",
        },
        {
          href: "/dashboard/support",
          icon: <LifeBuoy className="h-5 w-5" />,
          label: "Support",
        },
        {
          href: "/privacy",
          icon: <FileText className="h-5 w-5" />,
          label: "Privacy",
        },
      ],
    },
  ];

  return (
    <ProfileSidebarSurface
      isOpen={isOpen}
      avatarUrl={avatarUrl}
      profileInitial={profileInitial}
      primaryIdentity={primaryIdentity}
      secondaryIdentity={secondaryIdentity}
      isAdmin={isAdmin}
      gumDropsBalance={gumDropsBalance.toLocaleString()}
      navigationSections={navigationSections}
      onClose={onClose}
      onLogout={handleLogout}
      onPurchase={handlePurchase}
      onNavigate={handleNavigation}
    />
  );
}
