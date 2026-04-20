
import fs from "fs";
const file = "src/components/DropCard.tsx";
let code = fs.readFileSync(file, "utf-8");

const oldTimer = `function DropCardTimer({ validUntil }: { validUntil?: number }) {
    const [timeLeft, setTimeLeft] = useState("Ends soon");
    const [isUrgent, setIsUrgent] = useState(false);
    const [isCritical, setIsCritical] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (!validUntil) {
                setTimeLeft("No end date");
                return;
            }

            const msLeft = Math.max(0, validUntil - Date.now());
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const ONE_DAY_MS = 24 * ONE_HOUR_MS;

            setIsUrgent(msLeft > 0 && msLeft <= ONE_DAY_MS);
            setIsCritical(msLeft > 0 && msLeft <= ONE_HOUR_MS);

            if (msLeft === 0) {
                setTimeLeft("Expired");
                return;
            }

            if (msLeft >= ONE_DAY_MS) {
                const days = Math.ceil(msLeft / ONE_DAY_MS);
                setTimeLeft(\`Ends in \${days} day\${days === 1 ? "" : "s"}\`);
                return;
            }

            const totalSeconds = Math.floor(msLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (value: number) => value.toString().padStart(2, "0");
            setTimeLeft(\`Ends in \${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\`);
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(interval);
    }, [validUntil]);

    return (
        <div className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] md:text-xs font-mono font-bold transition-colors",
            isCritical ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" :
                isUrgent ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                    "border-white/20 bg-black/60 text-white"
        )}>
            <Clock className={cn("h-3 w-3", isCritical ? "text-red-500" : isUrgent ? "text-orange-400" : "text-brand-purple")} />
            <span>{timeLeft}</span>
        </div>
    );
}`;

const newTimer = `function DropCardTimer({ validUntil }: { validUntil?: number }) {
    const [timeLeft, setTimeLeft] = useState("Ends soon");
    const [urgencyState, setUrgencyState] = useState<"calm" | "warm" | "critical">("calm");

    useEffect(() => {
        const updateTimer = () => {
            if (!validUntil) {
                setTimeLeft("No end date");
                return;
            }

            const msLeft = Math.max(0, validUntil - Date.now());
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const ONE_DAY_MS = 24 * ONE_HOUR_MS;

            if (msLeft === 0) {
                setTimeLeft("Expired");
                setUrgencyState("critical");
                return;
            }

            if (msLeft <= 4 * ONE_HOUR_MS) {
                setUrgencyState("critical");
            } else if (msLeft <= ONE_DAY_MS) {
                setUrgencyState("warm");
            } else {
                setUrgencyState("calm");
            }

            if (msLeft >= ONE_DAY_MS) {
                const days = Math.ceil(msLeft / ONE_DAY_MS);
                setTimeLeft(\`Ends in \${days} day\${days === 1 ? "" : "s"}\`);
                return;
            }

            const totalSeconds = Math.floor(msLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (value: number) => value.toString().padStart(2, "0");
            setTimeLeft(\`Ends in \${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\`);
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(interval);
    }, [validUntil]);

    return (
        <div className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 md:px-2.5 md:py-1 text-[9px] md:text-[10px] font-mono font-bold transition-colors w-full justify-center max-w-[120px]",
            urgencyState === "critical" ? "bg-fuchsia-900/30 border-fuchsia-500/40 text-fuchsia-200 animate-pulse" :
                urgencyState === "warm" ? "bg-[#b28cff]/15 border-[#b28cff]/30 text-[#e4d4ff]" :
                    "border-white/10 bg-black/40 text-gray-300"
        )}>
            <Clock className={cn("h-3 w-3", urgencyState === "critical" ? "text-fuchsia-400" : urgencyState === "warm" ? "text-[#b28cff]" : "text-gray-400")} />
            <span>{timeLeft}</span>
        </div>
    );
}`;

// normalize line endings in both strings and original code
code = code.replace(/\r\n/g, "\n");
const oldTimerNorm = oldTimer.replace(/\r\n/g, "\n");

if (code.includes(oldTimerNorm)) {
    code = code.replace(oldTimerNorm, newTimer.replace(/\n/g, "\r\n"));
    fs.writeFileSync(file, code);
    console.log("Success: DropCardTimer updated");
} else {
    console.error("Failed to find old timer code. Check exact whitespace!");
}
