import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

type Invariant = {
  id: string;
  file: string;
  description: string;
  test: (source: string) => boolean;
};

const invariants: Invariant[] = [
  {
    id: "chat-route-main-height",
    file: "src/components/Chat/ChatRouteShell.tsx",
    description: "chat route bounds the root main element to a 100dvh-backed visual viewport token",
    test: (source) => source.includes("USER_MOBILE_CHAT_VIEWPORT_HEIGHT")
      && source.includes("mainElement.style.height = USER_MOBILE_CHAT_VIEWPORT_HEIGHT")
      && source.includes("mainElement.style.maxHeight = USER_MOBILE_CHAT_VIEWPORT_HEIGHT")
      && source.includes("--chat-visual-viewport-height")
      && source.includes('mainElement.style.minHeight = "0"'),
  },
  {
    id: "chat-route-main-height-restore",
    file: "src/components/Chat/ChatRouteShell.tsx",
    description: "chat route restores main height overrides on unmount",
    test: (source) => source.includes("previousMainHeight")
      && source.includes("previousMainMaxHeight")
      && source.includes("previousMainMinHeight")
      && source.includes("mainElement.style.height = previousMainHeight"),
  },
  {
    id: "compact-recovery-respects-route-lock",
    file: "src/lib/self-healing.ts",
    description: "compact recovery guard does not clear expected route-owned scroll locks",
    test: (source) => source.includes("isDocumentScrollLockExpected")
      && source.includes("documentScrollLockExpected")
      && source.includes("!documentScrollLockExpected && snapshot.htmlOverflow"),
  },
  {
    id: "chat-recovery-declares-expected-lock",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "chat compact recovery declares the chat route scroll lock as expected",
    test: (source) => (source.match(/isDocumentScrollLockExpected:\s*\(\)\s*=>\s*true/g) ?? []).length >= 2,
  },
  {
    id: "chat-shell-max-height",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "chat viewport shell carries full-height and max-height constraints",
    test: (source) => source.includes("CHAT_VIEWPORT_SHELL_CLASSNAME")
      && source.includes("h-full max-h-full min-h-0")
      && source.includes("overflow-hidden"),
  },
  {
    id: "compact-thread-list-panel-bounded",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "compact thread list panel is a bounded flex column",
    test: (source) => source.includes("CHAT_COMPACT_THREAD_LIST_PANEL_CLASSNAME")
      && source.includes("flex h-full max-h-full min-h-0 flex-col overflow-hidden"),
  },
  {
    id: "compact-thread-list-nested-scroll",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "compact thread list uses a nested vertical scroll owner",
    test: (source) => source.includes("CHAT_COMPACT_THREAD_LIST_SCROLL_CLASSNAME")
      && source.includes("min-h-0 flex-1 overflow-y-auto overscroll-y-contain"),
  },
  {
    id: "compact-thread-list-scroll-ref",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "compact thread list scroll owner is ref-backed for runtime diagnostics",
    test: (source) => source.includes("compactThreadListScrollRef")
      && source.includes("ref={compactThreadListScrollRef}"),
  },
  {
    id: "compact-thread-list-runtime-diagnostic",
    file: "src/components/Chat/ChatExperience.tsx",
    description: "compact thread list reports viewport-bound violations through client diagnostics",
    test: (source) => source.includes("Compact chat list layout violated viewport bounds")
      && source.includes("chat_compact_thread_list")
      && source.includes("shellBottomOverflowPx")
      && source.includes("documentScrollLeak"),
  },
  {
    id: "mobile-doctrine-check-in-runtime-lane",
    file: "package.json",
    description: "mobile UI doctrine check is part of the runtime UI verification lane",
    test: (source) => source.includes('"check:ui:mobile-doctrine"')
      && source.includes("npm run check:ui:mobile-doctrine"),
  },
];

const failures = invariants.flatMap((invariant) => {
  const source = readRepoFile(invariant.file);
  return invariant.test(source)
    ? []
    : [`${invariant.id}: ${invariant.description} (${invariant.file})`];
});

const chatSource = readRepoFile("src/components/Chat/ChatExperience.tsx");
const forbiddenChatHeightPatterns = [
  /min-h-screen/,
  /h-screen/,
  /100vh/,
];

for (const pattern of forbiddenChatHeightPatterns) {
  if (pattern.test(chatSource)) {
    failures.push(`chat-forbidden-fixed-viewport: compact chat must not use ${pattern} in ChatExperience.tsx`);
  }
}

if (failures.length > 0) {
  console.error("Mobile UI doctrine check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Mobile UI doctrine check passed (${invariants.length} invariants).`);
