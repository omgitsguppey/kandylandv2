import { QUEUE_RUNTIME_WARNING_BUDGETS, type RuntimeWarningRecord } from "../shared/runtime/runtime-warning-contract";
import { getRuntimeAdminDb } from "./runtime-admin";

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

export async function checkWarnings() {
    const adminDb = getRuntimeAdminDb();
    const snapshot = await adminDb.collection("runtime_warning_records").get();
    const warnings = snapshot.docs.map((doc) => doc.data() as RuntimeWarningRecord);
    const failures = warnings.flatMap((warning) => {
        const budget = QUEUE_RUNTIME_WARNING_BUDGETS[warning.code];
        if (typeof budget !== "number") {
            return [];
        }

        return warning.occurrenceCount > budget
            ? [`${warning.code} exceeded budget ${budget} with occurrenceCount=${warning.occurrenceCount} on ${warning.surface}.`]
            : [];
    });

    assert(failures.length === 0, failures.join("\n"));
}

if (require.main === module) {
    checkWarnings()
        .then(() => console.log("Runtime warning budget check passed."))
        .catch((error) => {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        });
}
