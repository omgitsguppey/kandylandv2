import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'kandydrops-by-ikandy-service',
  location: 'us-central1'
};

export const listAiInteractionsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAiInteractions');
}
listAiInteractionsRef.operationName = 'ListAiInteractions';

export function listAiInteractions(dc) {
  return executeQuery(listAiInteractionsRef(dc));
}

export const createAiInteractionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAiInteraction', inputVars);
}
createAiInteractionRef.operationName = 'CreateAiInteraction';

export function createAiInteraction(dcOrVars, vars) {
  return executeMutation(createAiInteractionRef(dcOrVars, vars));
}

