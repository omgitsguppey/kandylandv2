import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
    return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
    if (!condition) {
        failures.push(message);
    }
}

const failures: string[] = [];

const chatExperience = read("src/components/Chat/ChatExperience.tsx");
const chatLib = read("src/lib/chat.ts");
const chatServer = read("src/lib/server/chat.ts");
const paypalCaptureRoute = read("src/app/api/paypal/capture/route.ts");
const dbTypes = read("src/types/db.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const packageJson = read("package.json");

assert(packageJson.includes('"check:chat-paid-gumdrops-guidance"'), "package.json must expose check:chat-paid-gumdrops-guidance.", failures);

assert(chatExperience.includes('export const CHAT_VIEWPORT_SHELL_CLASSNAME ='), "ChatExperience must still declare CHAT_VIEWPORT_SHELL_CLASSNAME.", failures);
assert(chatExperience.includes('"mx-auto box-border flex h-full max-h-full min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-3 sm:px-4"'), "CHAT_VIEWPORT_SHELL_CLASSNAME must remain unchanged.", failures);
assert(chatExperience.includes("const chatViewportShellStyle = useMemo"), "chatViewportShellStyle must still exist.", failures);
assert(chatExperience.includes("const chatTranscriptStyle = useMemo"), "chatTranscriptStyle must still exist.", failures);
assert(chatExperience.includes("CHAT_THREAD_COMPOSER_PADDING_BOTTOM"), "ChatExperience must still use the existing composer padding shell token.", failures);

assert(chatExperience.includes("Follow creators to start chatting"), "ChatExperience must show no-followed-creators guidance.", failures);
assert(chatExperience.includes("Find creators"), "ChatExperience must include the Find creators CTA.", failures);
assert(chatExperience.includes("Browse drops"), "ChatExperience must include the Browse drops CTA.", failures);
assert(chatExperience.includes("recommendedCreators"), "ChatExperience must load recommended creators for the no-follow state.", failures);

assert(chatExperience.includes("buildChatPaidGdGateState"), "ChatExperience must derive proactive paid-GD guidance from the canonical gate helper.", failures);
assert(chatExperience.includes("chat_paid_gd_gate_viewed"), "ChatExperience must track chat_paid_gd_gate_viewed.", failures);
assert(chatExperience.includes("openPurchaseModal(resolveChatPaidGdPurchaseTarget"), "Get More GumDrops must open the purchase modal with a preferred amount.", failures);
assert(chatExperience.includes('router.push("/drops")'), "Go unwrap drops must route to /drops.", failures);
assert(chatExperience.includes('placeholder={composerBlockedByPaidGdGate ? "Paid GumDrops required for creator messaging"'), "ChatExperience must proactively block the composer before send.", failures);

assert(chatLib.includes("purchasedBalanceGd"), "Chat paid-GD gate must use purchasedBalanceGd.", failures);
assert(!chatLib.includes("totalGd"), "Chat paid-GD gate must not use total GumDrops as the affordability source.", failures);
assert(chatLib.includes("subscriberFreeChatApplies"), "Chat paid-GD gate must preserve subscriber-free-chat bypass.", failures);
assert(chatLib.includes("creatorViewerBypass"), "Chat paid-GD gate must preserve creator viewer bypass.", failures);

assert(dbTypes.includes("chatPaidGdLowBalanceReminder"), "UserProfile must include chatPaidGdLowBalanceReminder state.", failures);
assert(chatServer.includes("chat_low_paid_gd_reminder_sent"), "Server chat must emit chat_low_paid_gd_reminder_sent.", failures);
assert(chatServer.includes("eligibleAgain"), "Server chat reminder logic must use eligibleAgain gating.", failures);
assert(paypalCaptureRoute.includes("chatPaidGdLowBalanceReminder"), "PayPal capture must reset chatPaidGdLowBalanceReminder on paid refill.", failures);
assert(paypalCaptureRoute.includes("chat_low_paid_gd_reminder_reset"), "Paid refill must emit chat_low_paid_gd_reminder_reset telemetry.", failures);
assert(
    /sourceAwareBalance\.purchased\s*<\s*100\s*&&\s*nextSourceAwareBalance\.purchased\s*>=\s*100/u.test(paypalCaptureRoute),
    "Reminder reset must require paid balance reaching 100+.",
    failures,
);

assert(chatServer.includes('errorCode: "insufficient_paid_gumdrops"'), "Backend send guard must still enforce insufficient_paid_gumdrops.", failures);

[
    "chat_no_followed_creators_prompt_viewed",
    "chat_no_followed_creators_cta_clicked",
    "chat_paid_gd_gate_viewed",
    "chat_paid_gd_gate_primary_clicked",
    "chat_paid_gd_gate_secondary_clicked",
    "chat_low_paid_gd_reminder_sent",
    "chat_low_paid_gd_reminder_reset",
    "chat_thread_auto_created_or_resolved",
].forEach((eventName) => {
    assert(telemetryCatalog.includes(`eventName: "${eventName}"`), `Telemetry catalog must include ${eventName}.`, failures);
});

if (failures.length > 0) {
    console.error("Chat paid GumDrops guidance validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Chat paid GumDrops guidance validation passed.");
