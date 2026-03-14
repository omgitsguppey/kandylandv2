import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AiInteraction_Key {
  id: UUIDString;
  __typename?: 'AiInteraction_Key';
}

export interface AnalyticsAlert_Key {
  id: UUIDString;
  __typename?: 'AnalyticsAlert_Key';
}

export interface AnalyticsBundleDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsBundleDaily_Key';
}

export interface AnalyticsCommerceDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsCommerceDaily_Key';
}

export interface AnalyticsDropDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsDropDaily_Key';
}

export interface AnalyticsEventFact_Key {
  id: UUIDString;
  __typename?: 'AnalyticsEventFact_Key';
}

export interface AnalyticsHeatmapPoint_Key {
  id: UUIDString;
  __typename?: 'AnalyticsHeatmapPoint_Key';
}

export interface AnalyticsPageDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsPageDaily_Key';
}

export interface AnalyticsSessionFact_Key {
  id: UUIDString;
  __typename?: 'AnalyticsSessionFact_Key';
}

export interface AnalyticsTargetDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsTargetDaily_Key';
}

export interface AnalyticsUserDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsUserDaily_Key';
}

export interface CreateAiInteractionData {
  aiInteraction_insert: AiInteraction_Key;
}

export interface CreateAiInteractionVariables {
  modelUsed: string;
  promptContent: string;
  responseContent: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs: number;
}

export interface GetAnalyticsDropDailyTopData {
  analyticsDropDailies: ({
    id: UUIDString;
    dayKey: string;
    dropId: string;
    dropTitle?: string | null;
    dropCategory?: string | null;
    eventCount: number;
    viewerSessionCount: number;
    unwrapCount: number;
    downloadCount: number;
    relatedClickCount: number;
    spendGdTotal: number;
    watchSecondsTotal: number;
    lastEventAtMs?: number | null;
  } & AnalyticsDropDaily_Key)[];
}

export interface GetAnalyticsDropDailyTopVariables {
  dayKey: string;
}

export interface GetAnalyticsPageDailyTopData {
  analyticsPageDailies: ({
    id: UUIDString;
    dayKey: string;
    pagePath: string;
    pageViews: number;
    clickCount: number;
    hoverCount: number;
    dwellMsTotal: number;
    dwellSampleCount: number;
    maxScrollDepth: number;
    lastEventAtMs?: number | null;
  } & AnalyticsPageDaily_Key)[];
}

export interface GetAnalyticsPageDailyTopVariables {
  dayKey: string;
}

export interface ListAiInteractionsData {
  aiInteractions: ({
    id: UUIDString;
    modelUsed: string;
    promptContent: string;
    responseContent: string;
    promptTokens?: number | null;
    completionTokens?: number | null;
    latencyMs: number;
    createdAt: DateString;
  } & AiInteraction_Key)[];
}

/** Generated Node Admin SDK operation action function for the 'CreateAiInteraction' Mutation. Allow users to execute without passing in DataConnect. */
export function createAiInteraction(dc: DataConnect, vars: CreateAiInteractionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAiInteractionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAiInteraction' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAiInteraction(vars: CreateAiInteractionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAiInteractionData>>;

/** Generated Node Admin SDK operation action function for the 'ListAiInteractions' Query. Allow users to execute without passing in DataConnect. */
export function listAiInteractions(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAiInteractionsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAiInteractions' Query. Allow users to pass in custom DataConnect instances. */
export function listAiInteractions(options?: OperationOptions): Promise<ExecuteOperationResponse<ListAiInteractionsData>>;

/** Generated Node Admin SDK operation action function for the 'GetAnalyticsPageDailyTop' Query. Allow users to execute without passing in DataConnect. */
export function getAnalyticsPageDailyTop(dc: DataConnect, vars: GetAnalyticsPageDailyTopVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnalyticsPageDailyTopData>>;
/** Generated Node Admin SDK operation action function for the 'GetAnalyticsPageDailyTop' Query. Allow users to pass in custom DataConnect instances. */
export function getAnalyticsPageDailyTop(vars: GetAnalyticsPageDailyTopVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnalyticsPageDailyTopData>>;

/** Generated Node Admin SDK operation action function for the 'GetAnalyticsDropDailyTop' Query. Allow users to execute without passing in DataConnect. */
export function getAnalyticsDropDailyTop(dc: DataConnect, vars: GetAnalyticsDropDailyTopVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnalyticsDropDailyTopData>>;
/** Generated Node Admin SDK operation action function for the 'GetAnalyticsDropDailyTop' Query. Allow users to pass in custom DataConnect instances. */
export function getAnalyticsDropDailyTop(vars: GetAnalyticsDropDailyTopVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAnalyticsDropDailyTopData>>;

