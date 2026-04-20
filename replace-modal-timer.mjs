
import fs from "fs";
const file = "src/components/DropPreviewModal.tsx";
let code = fs.readFileSync(file, "utf-8");

const oldTimerFunc = `function getTimerLabel(validFrom: number, validUntil?: number): string {
  const now = Date.now();
  if (now < validFrom) {
    return \`Starts in \${formatDistanceToNow(validFrom)}\`;
  }

  if (!validUntil) {
    return "Always available";
  }

  if (now >= validUntil) {
    return "Expired";
  }

  return \`\${formatDistanceToNow(validUntil)} left\`;
}`;

const newTimerHook = `function useModalTimer(validFrom: number, validUntil?: number) {
    const [label, setLabel] = useState("");
    const [urgencyState, setUrgencyState] = useState<"calm" | "warm" | "critical">("calm");

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            if (now < validFrom) {
                setLabel(\`Starts in \${formatDistanceToNow(validFrom)}\`);
                setUrgencyState("calm");
                return;
            }

            if (!validUntil) {
                setLabel("Always available");
                setUrgencyState("calm");
                return;
            }

            const msLeft = Math.max(0, validUntil - now);
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const ONE_DAY_MS = 24 * ONE_HOUR_MS;

            if (msLeft === 0) {
                setLabel("Expired");
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
                setLabel(\`Ends in \${days} day\${days === 1 ? "" : "s"}\`);
                return;
            }

            const totalSeconds = Math.floor(msLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (value: number) => value.toString().padStart(2, "0");
            setLabel(\`Ends in \${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\`);
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(interval);
    }, [validFrom, validUntil]);

    return { label, urgencyState };
}`;

const oldHookCall = `  const timerLabel = useMemo(() => (drop ? getTimerLabel(drop.validFrom, drop.validUntil) : ""), [drop]);`;

const newHookCall = `  const { label: timerLabel, urgencyState: timerUrgency } = useModalTimer(drop?.validFrom || 0, drop?.validUntil);`;

const oldBadge = `                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-3 py-1 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-brand-purple flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {timerLabel}
                  </span>
                  <FileCountBadge drop={drop} />
                </div>`;

const newBadge = `                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={cn(
                      "px-3 py-1 rounded-full border flex items-center gap-1.5 transition-colors",
                      timerUrgency === "critical" ? "bg-fuchsia-900/30 border-fuchsia-500/40 text-fuchsia-200 animate-pulse" :
                      timerUrgency === "warm" ? "bg-[#b28cff]/15 border-[#b28cff]/30 text-[#e4d4ff]" :
                      "bg-brand-purple/15 border-brand-purple/30 text-brand-purple"
                  )}>
                    <Clock className={cn("w-3.5 h-3.5", timerUrgency === "critical" ? "text-fuchsia-400" : timerUrgency === "warm" ? "text-[#b28cff]" : "text-brand-purple")} /> 
                    {timerLabel || "Always available"}
                  </span>
                  <FileCountBadge drop={drop} />
                </div>`;

code = code.replace(/\r\n/g, "\n");
const oldTimerFuncNorm = oldTimerFunc.replace(/\r\n/g, "\n");
const oldHookCallNorm = oldHookCall.replace(/\r\n/g, "\n");
const oldBadgeNorm = oldBadge.replace(/\r\n/g, "\n");

let error = false;
if (code.includes(oldTimerFuncNorm)) { code = code.replace(oldTimerFuncNorm, newTimerHook.replace(/\n/g, "\r\n")); } else { error = true; console.error("timer metadata mismatch"); }
if (code.includes(oldHookCallNorm)) { code = code.replace(oldHookCallNorm, newHookCall.replace(/\n/g, "\r\n")); } else { error = true; console.error("hook call mismatch"); }
if (code.includes(oldBadgeNorm)) { code = code.replace(oldBadgeNorm, newBadge.replace(/\n/g, "\r\n")); } else { error = true; console.error("badge layout mismatch"); }

if (!error) {
    fs.writeFileSync(file, code);
    console.log("Success: Modal layout updated");
}
