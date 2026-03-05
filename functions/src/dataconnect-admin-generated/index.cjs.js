const { validateAdminArgs } = require('firebase-admin/data-connect');

const connectorConfig = {
  connector: 'example',
  serviceId: 'kandydrops-by-ikandy-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

function listAiInteractions(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAiInteractions', undefined, inputOpts);
}
exports.listAiInteractions = listAiInteractions;

function createAiInteraction(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAiInteraction', inputVars, inputOpts);
}
exports.createAiInteraction = createAiInteraction;

