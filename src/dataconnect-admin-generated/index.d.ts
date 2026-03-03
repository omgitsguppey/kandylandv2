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

/** Generated Node Admin SDK operation action function for the 'CreateAiInteraction' Mutation. Allow users to execute without passing in DataConnect. */
export function createAiInteraction(dc: DataConnect, vars: CreateAiInteractionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAiInteractionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAiInteraction' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAiInteraction(vars: CreateAiInteractionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAiInteractionData>>;

/** Generated Node Admin SDK operation action function for the 'ListAiInteractions' Query. Allow users to execute without passing in DataConnect. */
export function listAiInteractions(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAiInteractionsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAiInteractions' Query. Allow users to pass in custom DataConnect instances. */
export function listAiInteractions(options?: OperationOptions): Promise<ExecuteOperationResponse<ListAiInteractionsData>>;

