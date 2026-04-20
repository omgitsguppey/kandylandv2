const fs = require('fs');

const FILE_PATH = `C:\\Users\\uylus\\OneDrive\\Documents\\KandyDrops_Final\\src\\app\\dashboard\\profile\\page.tsx`;
let content = fs.readFileSync(FILE_PATH, 'utf-8');

// 1. imports
content = content.replace(
  `CalendarDays } from "lucide-react";`,
  `CalendarDays, ChevronRight } from "lucide-react";\nimport { cn } from "@/lib/utils";`
);

// 2. replace SectionCard, ToggleRow, StaticSettingRow
const startComponentsMatch = /function SectionCard\({ title, children, id }: \{ title: string; children: React\.ReactNode; id\?\: string \}\) \{/g;
const endComponentsMatch = /export default function ProfilePage\(\) \{/g;

const startCompExec = [...content.matchAll(startComponentsMatch)][0];
const endCompExec = [...content.matchAll(endComponentsMatch)][0];

const newComponents = `function SectionContainer({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} className="mb-6 last:mb-0">
            <h2 className="mb-2 px-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-500">{title}</h2>
            <div className="overflow-hidden rounded-3xl bg-white/5 border border-white/5">
                {children}
            </div>
        </section>
    );
}

function NavigationRow({
    icon,
    label,
    description,
    onClick,
    href,
    destructive,
}: {
    icon?: React.ReactNode;
    label: string;
    description?: string;
    onClick?: () => void;
    href?: string;
    destructive?: boolean;
}) {
    const ComponentContent = (
        <>
            <div className="flex items-center gap-3 min-w-0">
                {icon && <div className={cn("shrink-0", destructive ? "text-red-500" : "text-gray-400")}>{icon}</div>}
                <div className="min-w-0 flex-1 text-left">
                    <p className={cn("truncate text-sm font-medium", destructive ? "text-red-500" : "text-gray-200")}>{label}</p>
                    {description && <p className="truncate text-xs text-gray-500">{description}</p>}
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
        </>
    );
    const className = "flex w-full items-center justify-between gap-4 py-3.5 px-4 transition-colors hover:bg-white/5 focus:bg-white/5 outline-none";
    
    if (href) {
        // @ts-ignore
        return <Link href={href} className={className}>{ComponentContent}</Link>;
    }
    return <button type="button" onClick={onClick} className={className}>{ComponentContent}</button>;
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    icon,
    disabled = false,
    badge,
    destructive,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    badge?: string;
    destructive?: boolean;
}) {
    return (
        <div className={cn("flex w-full items-center justify-between gap-4 py-3.5 px-4", disabled && "opacity-60")}>
            <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm font-medium", destructive ? "text-red-400" : "text-gray-200")}>{label}</p>
                        {badge && (
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                {badge}
                            </span>
                        )}
                    </div>
                    {description && <p className="mt-0.5 text-xs text-gray-500 leading-tight pr-4">{description}</p>}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={cn(
                    "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
                    checked ? (destructive ? "bg-red-500" : "bg-brand-purple") : "bg-white/10",
                    disabled && "cursor-not-allowed"
                )}
                aria-label={label + " toggle"}
                aria-pressed={checked}
            >
                <span className={cn(
                    "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all shadow-sm",
                    checked ? "left-[1.125rem]" : "left-[2px]"
                )} />
            </button>
        </div>
    );
}

function StaticRow({
    label,
    description,
    icon,
    badge,
}: {
    label: string;
    description?: string;
    icon?: React.ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex w-full items-start gap-3 py-3.5 px-4 bg-black/20">
            {icon && <div className="mt-0.5 shrink-0 text-brand-purple/70">{icon}</div>}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-300">{label}</p>
                    {badge && (
                        <span className="rounded-md bg-brand-purple/15 border border-brand-purple/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-purple">
                            {badge}
                        </span>
                    )}
                </div>
                {description && <p className="mt-0.5 text-xs text-gray-500 leading-tight">{description}</p>}
            </div>
        </div>
    );
}

function ValueInputRow({
    label,
    description,
    value,
    onChange,
    type = "text",
    min,
    step,
    disabled = false,
    icon,
    placeholder
}: {
    label: string;
    description?: string;
    value: string | number;
    onChange: (val: string) => void;
    type?: string;
    min?: number;
    step?: number;
    disabled?: boolean;
    icon?: React.ReactNode;
    placeholder?: string;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 bg-black/30">
            <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-300">{label}</p>
                    {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
                </div>
            </div>
            <input
                type={type}
                min={min}
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full sm:w-48 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
            />
        </div>
    );
}

function RowDivider() {
    return <div className="h-px w-full bg-white/5 ml-4" />;
}

export default function ProfilePage() {`;

if (startCompExec && endCompExec) {
    content = content.substring(0, startCompExec.index) + newComponents + content.substring(endCompExec.index + Array.from(endCompExec)[0].length);
} else {
    throw new Error("Could not find components section.");
}

// 3. Replace return block
const returnBlockMatch = /\n\s*return \(\r?\n\s*<div className="w-full px-4 max-w-2xl mx-auto"[^>]*>/g;
const returnExec = [...content.matchAll(returnBlockMatch)][0];

const newReturnBlock = `    return (
        <div className="w-full px-4 sm:px-6 max-w-2xl mx-auto pb-24">
            <PageViewEvent eventName="profile_settings_viewed" />
            <header className="mb-6 flex items-start justify-between gap-3 pt-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h1>
                <div className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    saving ? "border-brand-purple/30 bg-brand-purple/10 text-brand-purple" : 
                    saveFeedback && saveFeedback !== "Saved" && saveFeedback !== "Autosave on" && saveFeedback !== "Essential-only mode saved" ? "border-red-500/25 bg-red-500/10 text-red-200" : 
                    "border-white/10 bg-white/5 text-gray-400"
                )}>
                    {saving ? "Saving" : saveFeedback ?? "Autosave"}
                </div>
            </header>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                
                {/* 1. PROFILE */}
                <SectionContainer title="Profile">
                    <div className="flex items-center gap-4 p-4">
                        <div className="group relative h-16 w-16 rounded-full overflow-hidden border border-white/10 bg-black/40 shrink-0 cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleChangeAvatar}
                                disabled={isUploadingAvatar}
                            />
                            {isUploadingAvatar ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-0">
                                    <Camera className="w-5 h-5 text-white" />
                                </div>
                            )}
                            {user?.photoURL ? (
                                // @ts-ignore
                                <Image src={user.photoURL} alt="Avatar" fill sizes="64px" className="object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{avatarFallback}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold text-white truncate">{profileIdentityLabel}</p>
                            <p className="text-sm text-gray-400 truncate">{profileIdentityDetail}</p>
                        </div>
                    </div>
                    <RowDivider />
                    <ValueInputRow
                        label="Display Name"
                        value={formState.displayName}
                        onChange={(val) => updateForm("displayName", val)}
                        placeholder="Enter your name"
                        icon={<User className="w-4 h-4" />}
                    />
                    <RowDivider />
                    <ValueInputRow
                        label="Username"
                        description="Used for short URLs and identification"
                        value={formState.username}
                        onChange={(val) => updateForm("username", sanitizeUsername(val))}
                        placeholder="your_handle"
                        icon={<AtSign className="w-4 h-4" />}
                    />
                </SectionContainer>

                {/* 2. ACCOUNT */}
                <SectionContainer title="Account">
                    <div className="flex w-full items-center justify-between gap-4 py-3.5 px-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 shrink-0 text-gray-400"><Mail className="w-4 h-4" /></div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-300">Email Address</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 truncate max-w-[150px] sm:max-w-none">{profileEmail}</p>
                    </div>
                    <RowDivider />
                    <ValueInputRow
                        label="Birthday"
                        value={formState.dateOfBirth}
                        onChange={(val) => updateForm("dateOfBirth", val)}
                        type="date"
                        icon={<CalendarDays className="w-4 h-4" />}
                    />
                    <RowDivider />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 bg-black/30">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0 text-gray-400"><Globe className="w-4 h-4" /></div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-300">Timezone</p>
                            </div>
                        </div>
                        <select
                            value={formState.timezone}
                            onChange={(e) => updateForm("timezone", normalizeTimezone(e.target.value))}
                            className="w-full sm:w-48 appearance-none rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none"
                        >
                            {TIMEZONE_OPTIONS.map((tz) => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                    <RowDivider />
                    <div className="grid grid-cols-3 divide-x divide-white/5 py-3">
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-lg font-bold text-white">{userProfile?.gumDropsBalance || 0}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">GumDrops</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-lg font-bold text-white">{userProfile?.unlockedContent?.length || 0}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Unlocked</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center px-2">
                            <span className="text-sm font-bold text-white pt-1">{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : "Recently"}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Joined</span>
                        </div>
                    </div>
                </SectionContainer>

                {/* 3. NOTIFICATIONS */}
                <SectionContainer title="Notifications">
                    <StaticRow
                        label="Service & Purchase Notices"
                        description="Required for security and payments."
                        icon={<ShieldAlert className="w-4 h-4" />}
                        badge="Required"
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Browser push alerts"
                        description={notificationSupportMessage || "Reminders for tasks and drops."}
                        checked={formState.browserPushEnabled}
                        onChange={(value) => void handleBrowserPushToggle(value)}
                        disabled={notificationSetupLoading}
                        badge={notificationSetupLoading ? "Wait" : undefined}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="In-app alerts"
                        description="Show task and drop alerts inside the app."
                        checked={formState.inAppEnabled}
                        onChange={(value) => updateForm("inAppEnabled", value)}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="New releases"
                        description="Alert me when new drops go live."
                        checked={formState.newDropAlerts}
                        onChange={(value) => updateForm("newDropAlerts", value)}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Ending soon"
                        description="Warn me before drops expire."
                        checked={formState.expiringSoonAlerts}
                        onChange={(value) => updateForm("expiringSoonAlerts", value)}
                    />
                </SectionContainer>

                {/* 4. PRIVACY & DATA */}
                <SectionContainer title="Privacy & Data">
                    <StaticRow
                        label="Strictly necessary storage"
                        description="Required for sign-in and core operations."
                        icon={<Lock className="w-4 h-4" />}
                        badge="Required"
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Anonymous analytics"
                        description="Measure usage without tying it to your account."
                        checked={formState.anonymousAnalyticsEnabled}
                        onChange={(value) => {
                            updateForm("anonymousAnalyticsEnabled", value);
                            if (!value) {
                                updateForm("identifiedAnalyticsEnabled", false);
                                updateForm("allowRecommendations", false);
                                updateForm("showInAnonymousStats", false);
                            }
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Account-linked analytics"
                        checked={formState.identifiedAnalyticsEnabled}
                        onChange={(value) => {
                            updateForm("identifiedAnalyticsEnabled", value);
                            if (value) updateForm("anonymousAnalyticsEnabled", true);
                            else updateForm("allowRecommendations", false);
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Activity recommendations"
                        checked={formState.allowRecommendations}
                        onChange={(value) => {
                            updateForm("allowRecommendations", value);
                            if (value) {
                                updateForm("anonymousAnalyticsEnabled", true);
                                updateForm("identifiedAnalyticsEnabled", true);
                            }
                        }}
                    />
                    <RowDivider />
                    <ToggleRow
                        label="Honor Global Privacy Control"
                        checked={formState.honorGlobalPrivacyControl}
                        onChange={(value) => updateForm("honorGlobalPrivacyControl", value)}
                        badge={browserGpcEnabled ? "Detected" : undefined}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Essential Only Mode"
                        description="Turn off all optional tracking immediately."
                        icon={<ShieldAlert className="w-4 h-4" />}
                        onClick={() => void handleWithdrawOptionalTracking()}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Download My Data"
                        description="Export your account data securely as JSON."
                        icon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleDownloadData}
                    />
                    <RowDivider />
                    <NavigationRow
                        label="Privacy Policy"
                        description={\`Last updated: \${PRIVACY_POLICY_LAST_UPDATED}\`}
                        icon={<FileText className="w-4 h-4" />}
                        href="/privacy"
                    />
                </SectionContainer>

                {/* 5. WALLET & EARNINGS (Creator Only) */}
                {isCreatorAccount && (
                    <SectionContainer title="Creator Earnings">
                        <div className="flex items-center justify-between px-4 py-4">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Earnings</p>
                                <p className="text-2xl font-black text-brand-purple mt-1">{creatorStats?.earningsGd || 0} GD</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Subscribers</p>
                                <p className="text-xl font-bold text-white mt-1">{creatorStats?.activeSubscribers || 0}</p>
                            </div>
                        </div>
                        <RowDivider />
                        <div className="p-4 bg-black/20">
                            <p className="text-sm font-medium text-gray-200 mb-2">Request Payout <span className="text-gray-500 text-xs ml-1">(100 GD = $1)</span></p>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    min={100}
                                    step={100}
                                    value={creatorPayoutAmount}
                                    onChange={(event) => setCreatorPayoutAmount(Math.max(100, Number(event.target.value) || 100))}
                                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleRequestCreatorPayout}
                                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 transition-colors"
                                >
                                    Request
                                </button>
                            </div>
                        </div>
                    </SectionContainer>
                )}

                {/* 6. CREATOR TOOLS (Creator Only) */}
                {isCreatorAccount && (
                    <SectionContainer title="Creator Tools">
                        {creatorSettingsNotice && (
                            <div className="px-4 py-3 bg-amber-500/10 text-amber-200 text-xs border-b border-white/5">
                                {creatorSettingsNotice}
                            </div>
                        )}
                        <ToggleRow
                            label="Creator messaging"
                            checked={creatorSettingsState.messagingEnabled}
                            onChange={(value) => updateCreatorSettingsState("messagingEnabled", value)}
                            icon={<MessageSquare className="w-4 h-4" />}
                        />
                        <RowDivider />
                        <ToggleRow
                            label="Creator broadcasts"
                            checked={creatorSettingsState.broadcastsEnabled}
                            onChange={(value) => updateCreatorSettingsState("broadcastsEnabled", value)}
                            icon={<Sparkles className="w-4 h-4" />}
                        />
                        {creatorSettingsState.broadcastsEnabled && (
                            <div className="px-4 py-3 bg-black/40 border-y border-white/5 mx-4 my-2 rounded-xl">
                                <textarea
                                    value={creatorBroadcastMessage}
                                    onChange={(event) => setCreatorBroadcastMessage(event.target.value.slice(0, 280))}
                                    rows={2}
                                    placeholder="Tell followers what just dropped..."
                                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white resize-none outline-none focus:border-brand-purple/50"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-gray-500">{creatorBroadcastMessage.length}/280</span>
                                    <button
                                        type="button"
                                        onClick={handleSendCreatorBroadcast}
                                        disabled={sendingCreatorBroadcast || creatorBroadcastMessage.trim().length < 4}
                                        className="rounded-md bg-brand-purple/20 text-brand-purple px-3 py-1 text-xs font-bold disabled:opacity-50 transition-colors"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Subscriptions"
                            checked={creatorSettingsState.subscriptionsEnabled}
                            onChange={(value) => updateCreatorSettingsState("subscriptionsEnabled", value)}
                            icon={<Wallet className="w-4 h-4" />}
                        />
                        {creatorSettingsState.subscriptionsEnabled && (
                            <>
                                <RowDivider />
                                <ValueInputRow
                                    label="Monthly price w/ fees"
                                    type="number"
                                    min={CREATOR_SUBSCRIPTION_MIN_GD}
                                    value={creatorSettingsState.subscriptionPriceGd}
                                    onChange={(val) => updateCreatorSettingsState("subscriptionPriceGd", Math.max(CREATOR_SUBSCRIPTION_MIN_GD, Number(val)))}
                                />
                            </>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Calls + bookings"
                            checked={creatorSettingsState.bookingsEnabled}
                            onChange={(value) => updateCreatorSettingsState("bookingsEnabled", value)}
                            icon={<CalendarClock className="w-4 h-4" />}
                        />
                        {creatorSettingsState.bookingsEnabled && (
                            <>
                                <RowDivider />
                                <ValueInputRow
                                    label="Booking min minutes"
                                    type="number"
                                    min={5} step={5}
                                    value={creatorSettingsState.bookingMinimumMinutes}
                                    onChange={(val) => updateCreatorSettingsState("bookingMinimumMinutes", Math.max(5, Number(val)))}
                                />
                                <RowDivider />
                                <ValueInputRow
                                    label="Phone rate / min"
                                    type="number"
                                    value={creatorSettingsState.phoneRatePerMinuteGd}
                                    onChange={(val) => updateCreatorSettingsState("phoneRatePerMinuteGd", Math.max(0, Number(val)))}
                                />
                                <RowDivider />
                                <ValueInputRow
                                    label="Video rate / min"
                                    type="number"
                                    value={creatorSettingsState.videoRatePerMinuteGd}
                                    onChange={(val) => updateCreatorSettingsState("videoRatePerMinuteGd", Math.max(0, Number(val)))}
                                />
                            </>
                        )}
                        <RowDivider />
                        <ToggleRow
                            label="Custom requests"
                            checked={creatorSettingsState.customRequestsEnabled}
                            onChange={(value) => updateCreatorSettingsState("customRequestsEnabled", value)}
                            icon={<Sparkles className="w-4 h-4" />}
                        />
                        {creatorSettingsState.customRequestsEnabled && (
                            <div className="bg-black/30 border-y border-white/5 p-3 space-y-2 mx-4 my-2 rounded-xl">
                                {creatorSettingsState.requestCategories.map((category: any, index: number) => (
                                    <div key={category.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-sm font-medium text-white truncate">{category.label}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{category.description}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <input
                                                type="number" min={0}
                                                value={category.priceGd}
                                                onChange={(e) => {
                                                    const nextPrice = Math.max(0, Number(e.target.value) || 0);
                                                    setCreatorSettingsState((cur: any) => ({
                                                        ...cur,
                                                        requestCategories: cur.requestCategories.map((entry: any, i: number) => i === index ? { ...entry, priceGd: nextPrice } : entry)
                                                    }));
                                                }}
                                                className="w-16 rounded text-center border border-white/10 bg-black/50 py-1 text-xs text-white outline-none focus:border-brand-purple/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCreatorSettingsState((cur: any) => ({
                                                        ...cur,
                                                        requestCategories: cur.requestCategories.map((entry: any, i: number) => i === index ? { ...entry, enabled: !entry.enabled } : entry)
                                                    }));
                                                }}
                                                className={cn("rounded px-2 text-[10px] font-bold uppercase tracking-wider transition-colors", category.enabled ? "bg-brand-purple/20 text-brand-purple" : "bg-white/5 text-gray-500")}
                                            >
                                                {category.enabled ? "Vis" : "Hid"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <RowDivider />
                        <NavigationRow
                            label="Submit creator drop"
                            description="Upload new content to the platform"
                            icon={<Sparkles className="w-4 h-4" />}
                            onClick={() => setCreatorDropModalOpen(true)}
                        />
                        <RowDivider />
                        <button
                            type="button"
                            onClick={handleSaveCreatorSettings}
                            disabled={creatorSettingsLoading}
                            className="w-full py-4 text-center text-[13px] font-extrabold uppercase tracking-widest text-brand-purple hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            {creatorSettingsLoading ? "Saving..." : "Save Creator Requirements"}
                        </button>
                    </SectionContainer>
                )}

                {/* 7. SUPPORT & SAFETY */}
                <SectionContainer title="Support & Safety">
                    <NavigationRow label="FAQ" icon={<CircleHelp className="w-4 h-4" />} href="/faq" />
                    <RowDivider />
                    <NavigationRow label="Support" icon={<LifeBuoy className="w-4 h-4" />} href="/dashboard/support" />
                    <RowDivider />
                    <NavigationRow label="Policies" icon={<FileText className="w-4 h-4" />} href="/privacy" />
                    <RowDivider />
                    <NavigationRow label="Sign out" icon={<LogOut className="w-4 h-4" />} onClick={logout} />
                    <RowDivider />
                    <NavigationRow 
                        label="Delete Account" 
                        description="Permanently erase all your data."
                        icon={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                        onClick={handleRequestDeletion}
                        destructive 
                    />
                </SectionContainer>

            </form>
            {isCreatorAccount ? (
                // @ts-ignore
                <CreateDropModal
                    isOpen={creatorDropModalOpen}
                    onClose={() => setCreatorDropModalOpen(false)}
                    onSuccess={() => {
                        setCreatorDropModalOpen(false);
                        toast.success("Creator drop submitted for admin review.");
                    }}
                    mode="creator"
                    // @ts-ignore
                    creatorIdOverride={user?.uid || null}
                />
            ) : null}
        </div>
    );
}`;

if (returnExec) {
    content = content.substring(0, returnExec.index) + newReturnBlock + `\n}\n`;
    fs.writeFileSync(FILE_PATH, content);
    console.log("Successfully replaced settings layout. File length is: " + content.split('\\n').length);
} else {
    throw new Error("Could not find return block.");
}
