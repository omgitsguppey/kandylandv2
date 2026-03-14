import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

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

interface CreateAiInteractionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiInteractionVariables): MutationRef<CreateAiInteractionData, CreateAiInteractionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAiInteractionVariables): MutationRef<CreateAiInteractionData, CreateAiInteractionVariables>;
  operationName: string;
}
export const createAiInteractionRef: CreateAiInteractionRef;

export function createAiInteraction(vars: CreateAiInteractionVariables): MutationPromise<CreateAiInteractionData, CreateAiInteractionVariables>;
export function createAiInteraction(dc: DataConnect, vars: CreateAiInteractionVariables): MutationPromise<CreateAiInteractionData, CreateAiInteractionVariables>;

interface ListAiInteractionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAiInteractionsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAiInteractionsData, undefined>;
  operationName: string;
}
export const listAiInteractionsRef: ListAiInteractionsRef;

export function listAiInteractions(): QueryPromise<ListAiInteractionsData, undefined>;
export function listAiInteractions(dc: DataConnect): QueryPromise<ListAiInteractionsData, undefined>;

interface GetAnalyticsPageDailyTopRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAnalyticsPageDailyTopVariables): QueryRef<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAnalyticsPageDailyTopVariables): QueryRef<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;
  operationName: string;
}
export const getAnalyticsPageDailyTopRef: GetAnalyticsPageDailyTopRef;

export function getAnalyticsPageDailyTop(vars: GetAnalyticsPageDailyTopVariables): QueryPromise<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;
export function getAnalyticsPageDailyTop(dc: DataConnect, vars: GetAnalyticsPageDailyTopVariables): QueryPromise<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;

interface GetAnalyticsDropDailyTopRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAnalyticsDropDailyTopVariables): QueryRef<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAnalyticsDropDailyTopVariables): QueryRef<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;
  operationName: string;
}
export const getAnalyticsDropDailyTopRef: GetAnalyticsDropDailyTopRef;

export function getAnalyticsDropDailyTop(vars: GetAnalyticsDropDailyTopVariables): QueryPromise<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;
export function getAnalyticsDropDailyTop(dc: DataConnect, vars: GetAnalyticsDropDailyTopVariables): QueryPromise<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;

