import { useState, useEffect, useRef } from "react";
import { Drop } from "@/types/db";
import { describeSecurityEvent, type SecurityEventDescriptor } from "@/lib/security-events";
import { authFetch } from "@/lib/authFetch";
import { getClientSessionId } from "@/lib/client-session";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { isEditableTarget, ContentKind } from "../ViewerHelpers";

interface UseViewerSecurityProps {
    drop: Drop | null;
    isAuthorized: boolean;
    activeIndex: number;
    contentKind: ContentKind;
}

export function useViewerSecurity({ drop, isAuthorized, activeIndex, contentKind }: UseViewerSecurityProps) {
    const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);
    const [securityWarning, setSecurityWarning] = useState<SecurityEventDescriptor | null>(null);

    const securityLastSignalAtRef = useRef<Map<string, number>>(new Map());
    const securitySignalCountsRef = useRef<Map<string, number>>(new Map());
    const rapidVisibilityTimestampsRef = useRef<number[]>([]);
    const ripPatternTimestampsRef = useRef<number[]>([]);
    const securityResetTimeoutRef = useRef<number | null>(null);
    const securityLogViolationRef = useRef<(reason: string, metadata?: Record<string, string | number | boolean>) => void>(() => undefined);

    useEffect(() => {
        return () => {
            if (securityResetTimeoutRef.current !== null) {
                window.clearTimeout(securityResetTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isAuthorized || !drop) {
            securityLogViolationRef.current = () => undefined;
            return;
        }

        const logViolation = (reason: string, metadata: Record<string, string | number | boolean> = {}) => {
            const now = Date.now();
            const lastLoggedAt = securityLastSignalAtRef.current.get(reason) || 0;
            if (now - lastLoggedAt < 2500) return;
            
            securityLastSignalAtRef.current.set(reason, now);
            const descriptor = describeSecurityEvent(reason);
            const repeatCount = (securitySignalCountsRef.current.get(reason) || 0) + 1;
            securitySignalCountsRef.current.set(reason, repeatCount);

            setIsSecurityTriggered(true);
            setSecurityWarning(descriptor);

            try {
                authFetch("/api/security/log-attempt", {
                    method: "POST",
                    body: JSON.stringify({
                        dropId: drop.id,
                        reason,
                        assetIndex: activeIndex + 1,
                        assetKey: `${drop.id}:${activeIndex}`,
                        contentKind,
                        pagePath: typeof window !== "undefined" ? window.location.pathname : "/dashboard/viewer",
                        sessionId: getClientSessionId(),
                        repeatCount,
                        visibilityState: typeof document !== "undefined" ? document.visibilityState : "unknown",
                        ...metadata,
                    }),
                }).catch((err) => reportClientIssue({
                    channel: "runtime",
                    severity: "warn",
                    message: "Security violation log delivery failed",
                    error: err,
                    detail: { dropId: drop.id, reason, contentKind },
                    consoleLabel: "[ViewerSecurity] Security log POST failed",
                }));
            } catch (error) {
                reportClientIssue({
                    channel: "runtime",
                    severity: "warn",
                    message: "Security violation log construction failed",
                    error,
                    detail: { dropId: drop.id, reason },
                    consoleLabel: "[ViewerSecurity] Security log construction failed",
                });
            }

            if (securityResetTimeoutRef.current !== null) {
                window.clearTimeout(securityResetTimeoutRef.current);
            }
            securityResetTimeoutRef.current = window.setTimeout(() => {
                setIsSecurityTriggered(false);
                setSecurityWarning(null);
            }, 5000);
        };

        securityLogViolationRef.current = logViolation;

        const handleKeyDown = (e: KeyboardEvent) => {
            const lowerKey = e.key.toLowerCase();
            const modifierLabel = e.metaKey ? "Cmd" : e.ctrlKey ? "Ctrl" : "";
            const isMacScreenshotFull = e.metaKey && e.shiftKey && e.key === "3";
            const isMacScreenshotArea = e.metaKey && e.shiftKey && e.key === "4";
            const isMacCaptureToolbar = e.metaKey && e.shiftKey && e.key === "5";
            const isWindowsSnip = e.metaKey && e.shiftKey && lowerKey === "s";
            const isPrintScreen = e.key === "PrintScreen" || e.code === "PrintScreen";
            const isWindowsGameBarRecording = e.metaKey && e.altKey && lowerKey === "r";
            const isDevToolsShortcut = e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(lowerKey));
            const isPrintShortcut = (e.ctrlKey || e.metaKey) && lowerKey === "p";
            const isSaveShortcut = (e.ctrlKey || e.metaKey) && lowerKey === "s";
            const isSourceViewShortcut = (e.ctrlKey || e.metaKey) && lowerKey === "u";
            const isCopyShortcut = (e.ctrlKey || e.metaKey) && lowerKey === "c" && !isEditableTarget(e.target);

            if (isMacScreenshotFull) {
                e.preventDefault();
                logViolation("heuristic_screenshot_shortcut_mac_capture", { triggerSource: "keyboard", keyChord: "Cmd+Shift+3" });
                return;
            }
            if (isMacScreenshotArea) {
                e.preventDefault();
                logViolation("heuristic_screenshot_shortcut_mac_area", { triggerSource: "keyboard", keyChord: "Cmd+Shift+4" });
                return;
            }
            if (isMacCaptureToolbar) {
                e.preventDefault();
                logViolation("heuristic_screen_record_shortcut_mac_toolbar", { triggerSource: "keyboard", keyChord: "Cmd+Shift+5" });
                return;
            }
            if (isWindowsSnip) {
                e.preventDefault();
                logViolation("heuristic_screenshot_shortcut_windows_snip", { triggerSource: "keyboard", keyChord: "Meta+Shift+S" });
                return;
            }
            if (isPrintScreen) {
                logViolation("heuristic_screenshot_shortcut_printscreen", { triggerSource: "keyboard", keyChord: "PrintScreen" });
                return;
            }
            if (isWindowsGameBarRecording) {
                e.preventDefault();
                logViolation("heuristic_screen_record_shortcut_windows_gamebar", { triggerSource: "keyboard", keyChord: "Meta+Alt+R" });
                return;
            }
            if (isPrintShortcut) {
                e.preventDefault();
                logViolation("confirmed_print_shortcut", { triggerSource: "keyboard", keyChord: `${modifierLabel}+P` });
                return;
            }
            if (isSaveShortcut) {
                e.preventDefault();
                logViolation("confirmed_save_shortcut", { triggerSource: "keyboard", keyChord: `${modifierLabel}+S` });
                return;
            }
            if (isSourceViewShortcut) {
                e.preventDefault();
                logViolation("heuristic_source_view_shortcut", { triggerSource: "keyboard", keyChord: `${modifierLabel}+U` });
                return;
            }
            if (isCopyShortcut) {
                logViolation("confirmed_copy_shortcut", { triggerSource: "keyboard", keyChord: `${modifierLabel}+C` });
                return;
            }
            if (isDevToolsShortcut) {
                e.preventDefault();
                logViolation("heuristic_devtools_shortcut", { triggerSource: "keyboard", keyChord: "DevTools" });
            }
        };

        const trackRipPatternSignal = () => {
            const now = Date.now();
            const recent = ripPatternTimestampsRef.current.filter((timestamp) => now - timestamp <= 10000);
            recent.push(now);
            ripPatternTimestampsRef.current = recent;
            if (recent.length >= 5) {
                logViolation("heuristic_rip_pattern", { triggerSource: "rip_heuristic", repeatCount: recent.length });
                ripPatternTimestampsRef.current = []; // Reset to prevent spam
            }
        };

        const handleBeforePrint = () => { logViolation("confirmed_print_shortcut", { triggerSource: "beforeprint", keyChord: "Print dialog" }); };

        const handleCopy = (event: ClipboardEvent) => {
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            logViolation("confirmed_copy_shortcut", { triggerSource: "clipboard", keyChord: "Copy event" });
            trackRipPatternSignal();
        };

        const handleCut = (event: ClipboardEvent) => {
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            logViolation("confirmed_cut_shortcut", { triggerSource: "clipboard", keyChord: "Cut event" });
            trackRipPatternSignal();
        };

        const handleSelectStart = (event: Event) => {
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            logViolation("confirmed_selection_attempt", { triggerSource: "selection", keyChord: "Select start" });
            trackRipPatternSignal();
        };

        const handleDragStart = (event: DragEvent) => {
            event.preventDefault();
            logViolation("confirmed_drag_export_attempt", { triggerSource: "drag", keyChord: "Drag start" });
        };

        const handleVisibilitySignal = () => {
            if (document.visibilityState !== "hidden") return;
            const now = Date.now();
            const recent = rapidVisibilityTimestampsRef.current.filter((timestamp) => now - timestamp <= 8000);
            recent.push(now);
            rapidVisibilityTimestampsRef.current = recent;
            if (recent.length >= 3) {
                logViolation("heuristic_rapid_visibility_capture_pattern", {
                    triggerSource: "visibilitychange",
                    detail: "Repeated hide/show transitions",
                    repeatCount: recent.length,
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("beforeprint", handleBeforePrint);
        document.addEventListener("copy", handleCopy);
        document.addEventListener("cut", handleCut);
        document.addEventListener("selectstart", handleSelectStart);
        document.addEventListener("dragstart", handleDragStart);
        document.addEventListener("visibilitychange", handleVisibilitySignal);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("beforeprint", handleBeforePrint);
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("cut", handleCut);
            document.removeEventListener("selectstart", handleSelectStart);
            document.removeEventListener("dragstart", handleDragStart);
            document.removeEventListener("visibilitychange", handleVisibilitySignal);
        };
    }, [activeIndex, drop, isAuthorized, contentKind]);

    const preventContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        securityLogViolationRef.current("confirmed_context_menu_attempt", {
            triggerSource: "contextmenu",
            keyChord: "Right click",
        });
    };

    return {
        isSecurityTriggered,
        securityWarning,
        preventContextMenu
    };
}
