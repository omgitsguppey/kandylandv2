import { CreateAiInteractionData, CreateAiInteractionVariables, ListAiInteractionsData, GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables, GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateAiInteraction(options?: useDataConnectMutationOptions<CreateAiInteractionData, FirebaseError, CreateAiInteractionVariables>): UseDataConnectMutationResult<CreateAiInteractionData, CreateAiInteractionVariables>;
export function useCreateAiInteraction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiInteractionData, FirebaseError, CreateAiInteractionVariables>): UseDataConnectMutationResult<CreateAiInteractionData, CreateAiInteractionVariables>;

export function useListAiInteractions(options?: useDataConnectQueryOptions<ListAiInteractionsData>): UseDataConnectQueryResult<ListAiInteractionsData, undefined>;
export function useListAiInteractions(dc: DataConnect, options?: useDataConnectQueryOptions<ListAiInteractionsData>): UseDataConnectQueryResult<ListAiInteractionsData, undefined>;

export function useGetAnalyticsPageDailyTop(vars: GetAnalyticsPageDailyTopVariables, options?: useDataConnectQueryOptions<GetAnalyticsPageDailyTopData>): UseDataConnectQueryResult<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;
export function useGetAnalyticsPageDailyTop(dc: DataConnect, vars: GetAnalyticsPageDailyTopVariables, options?: useDataConnectQueryOptions<GetAnalyticsPageDailyTopData>): UseDataConnectQueryResult<GetAnalyticsPageDailyTopData, GetAnalyticsPageDailyTopVariables>;

export function useGetAnalyticsDropDailyTop(vars: GetAnalyticsDropDailyTopVariables, options?: useDataConnectQueryOptions<GetAnalyticsDropDailyTopData>): UseDataConnectQueryResult<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;
export function useGetAnalyticsDropDailyTop(dc: DataConnect, vars: GetAnalyticsDropDailyTopVariables, options?: useDataConnectQueryOptions<GetAnalyticsDropDailyTopData>): UseDataConnectQueryResult<GetAnalyticsDropDailyTopData, GetAnalyticsDropDailyTopVariables>;
