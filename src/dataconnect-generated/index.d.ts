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

export interface AnalyticsCommerceRollup_Key {
  id: UUIDString;
  __typename?: 'AnalyticsCommerceRollup_Key';
}

export interface AnalyticsDropDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsDropDaily_Key';
}

export interface AnalyticsEventFact_Key {
  id: UUIDString;
  __typename?: 'AnalyticsEventFact_Key';
}

export interface AnalyticsExportStatus_Key {
  id: UUIDString;
  __typename?: 'AnalyticsExportStatus_Key';
}

export interface AnalyticsHeatmapPoint_Key {
  id: UUIDString;
  __typename?: 'AnalyticsHeatmapPoint_Key';
}

export interface AnalyticsPageDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsPageDaily_Key';
}

export interface AnalyticsSecurityDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsSecurityDaily_Key';
}

export interface AnalyticsSessionFact_Key {
  id: UUIDString;
  __typename?: 'AnalyticsSessionFact_Key';
}

export interface AnalyticsTargetDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsTargetDaily_Key';
}

export interface AnalyticsTaskDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsTaskDaily_Key';
}

export interface AnalyticsTaskRollup_Key {
  id: UUIDString;
  __typename?: 'AnalyticsTaskRollup_Key';
}

export interface AnalyticsUserDaily_Key {
  id: UUIDString;
  __typename?: 'AnalyticsUserDaily_Key';
}

export interface AnalyticsUserRollup_Key {
  id: UUIDString;
  __typename?: 'AnalyticsUserRollup_Key';
}

export interface AnalyticsUserSecurityRollup_Key {
  id: UUIDString;
  __typename?: 'AnalyticsUserSecurityRollup_Key';
}

export interface AnalyticsWatchAsset_Key {
  id: UUIDString;
  __typename?: 'AnalyticsWatchAsset_Key';
}

export interface AnalyticsWatchSession_Key {
  id: UUIDString;
  __typename?: 'AnalyticsWatchSession_Key';
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

