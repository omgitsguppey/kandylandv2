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

export interface CreateAiInteractionData {
  aiInteraction_insert: AiInteraction_Key;
}

export interface CreateAiInteractionVariables {
  userId: string;
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

