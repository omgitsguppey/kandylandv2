const { validateAdminArgs } = require('firebase-admin/data-connect');

const connectorConfig = {
  connector: 'example',
  serviceId: 'kandydrops-by-ikandy-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

function createAiInteraction(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAiInteraction', inputVars, inputOpts);
}
exports.createAiInteraction = createAiInteraction;

function listAiInteractions(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAiInteractions', undefined, inputOpts);
}
exports.listAiInteractions = listAiInteractions;

function getAnalyticsPageDailyTop(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetAnalyticsPageDailyTop', inputVars, inputOpts);
}
exports.getAnalyticsPageDailyTop = getAnalyticsPageDailyTop;

function getAnalyticsDropDailyTop(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetAnalyticsDropDailyTop', inputVars, inputOpts);
}
exports.getAnalyticsDropDailyTop = getAnalyticsDropDailyTop;

