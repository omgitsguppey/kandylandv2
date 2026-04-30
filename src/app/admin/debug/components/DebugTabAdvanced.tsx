"use client";

import { DebugAdvancedTruth } from "./DebugAdvancedTruth";
import { DebugAdvancedDrift } from "./DebugAdvancedDrift";
import { DebugAdvancedTelemetry } from "./DebugAdvancedTelemetry";
import { DebugAdvancedBehavior } from "./DebugAdvancedBehavior";
import { DebugAdvancedExperiments } from "./DebugAdvancedExperiments";
import { DebugAdvancedDataValidation } from "./DebugAdvancedDataValidation";

/* ─── Props ─── */
export interface DebugTabAdvancedProps {
    data: any;
}

/* ─── Component ─── */
export function DebugTabAdvanced({ data }: DebugTabAdvancedProps) {
    return (
        <div className="space-y-4">
            <DebugAdvancedDataValidation />
            <DebugAdvancedTruth data={data} />
            <DebugAdvancedDrift data={data} />
            <DebugAdvancedTelemetry data={data} />
            <DebugAdvancedBehavior data={data} />
            <DebugAdvancedExperiments data={data} />
        </div>
    );
}
