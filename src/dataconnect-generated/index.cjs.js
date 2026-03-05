const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'kandydrops-by-ikandy-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const listAiInteractionsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAiInteractions');
}
listAiInteractionsRef.operationName = 'ListAiInteractions';
exports.listAiInteractionsRef = listAiInteractionsRef;

exports.listAiInteractions = function listAiInteractions(dc) {
  return executeQuery(listAiInteractionsRef(dc));
};

const createAiInteractionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAiInteraction', inputVars);
}
createAiInteractionRef.operationName = 'CreateAiInteraction';
exports.createAiInteractionRef = createAiInteractionRef;

exports.createAiInteraction = function createAiInteraction(dcOrVars, vars) {
  return executeMutation(createAiInteractionRef(dcOrVars, vars));
};
