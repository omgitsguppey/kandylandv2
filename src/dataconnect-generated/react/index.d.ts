import { ListAiInteractionsData, CreateAiInteractionData, CreateAiInteractionVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAiInteractions(options?: useDataConnectQueryOptions<ListAiInteractionsData>): UseDataConnectQueryResult<ListAiInteractionsData, undefined>;
export function useListAiInteractions(dc: DataConnect, options?: useDataConnectQueryOptions<ListAiInteractionsData>): UseDataConnectQueryResult<ListAiInteractionsData, undefined>;

export function useCreateAiInteraction(options?: useDataConnectMutationOptions<CreateAiInteractionData, FirebaseError, CreateAiInteractionVariables>): UseDataConnectMutationResult<CreateAiInteractionData, CreateAiInteractionVariables>;
export function useCreateAiInteraction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiInteractionData, FirebaseError, CreateAiInteractionVariables>): UseDataConnectMutationResult<CreateAiInteractionData, CreateAiInteractionVariables>;
