import "server-only";

import { getErrorMessage, recordRouteWarning } from "./route-diagnostics";
import type { ServerDiagnosticChannel } from "./server-diagnostics";

export function emptyQuerySnapshot<T>() {
  return {
    docs: [],
    size: 0,
    empty: true,
  } as unknown as FirebaseFirestore.QuerySnapshot<T>;
}

export function emptyDocumentSnapshot<T>() {
  return {
    exists: false,
    data: () => undefined,
  } as unknown as FirebaseFirestore.DocumentSnapshot<T>;
}

export function emptyCountSnapshot() {
  return {
    data: () => ({ count: 0 }),
  } as unknown as FirebaseFirestore.AggregateQuerySnapshot<{ count: FirebaseFirestore.AggregateField<number> }>;
}

function formatIssue(label: string, error: unknown) {
  return `${label} unavailable (${getErrorMessage(error).slice(0, 80)})`;
}

interface SafeReadInput {
  routeName: string;
  channel: ServerDiagnosticChannel;
  label: string;
  issues?: string[];
  detail?: Record<string, unknown>;
}

export async function safeQueryWithDiagnostics<T>(
  input: SafeReadInput & {
    reader: () => Promise<FirebaseFirestore.QuerySnapshot<T>>;
  },
) {
  try {
    return await input.reader();
  } catch (error) {
    input.issues?.push(formatIssue(input.label, error));
    recordRouteWarning(input.routeName, `${input.label} fallback used`, error, {
      channel: input.channel,
      detail: {
        readLabel: input.label,
        ...input.detail,
      },
    });
    return emptyQuerySnapshot<T>();
  }
}

export async function safeDocumentWithDiagnostics<T>(
  input: SafeReadInput & {
    reader: () => Promise<FirebaseFirestore.DocumentSnapshot<T>>;
  },
) {
  try {
    return await input.reader();
  } catch (error) {
    input.issues?.push(formatIssue(input.label, error));
    recordRouteWarning(input.routeName, `${input.label} fallback used`, error, {
      channel: input.channel,
      detail: {
        readLabel: input.label,
        ...input.detail,
      },
    });
    return emptyDocumentSnapshot<T>();
  }
}

export async function safeCountWithDiagnostics(
  input: SafeReadInput & {
    reader: () => Promise<FirebaseFirestore.AggregateQuerySnapshot<{ count: FirebaseFirestore.AggregateField<number> }>>;
  },
) {
  try {
    return await input.reader();
  } catch (error) {
    input.issues?.push(formatIssue(input.label, error));
    recordRouteWarning(input.routeName, `${input.label} fallback used`, error, {
      channel: input.channel,
      detail: {
        readLabel: input.label,
        ...input.detail,
      },
    });
    return emptyCountSnapshot();
  }
}
