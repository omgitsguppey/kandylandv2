import {
  buildConfigRuntimeSampleStatusClassifierReport,
  validateConfigRuntimeSampleStatusClassifierReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Config runtime sample status classifier",
  statePath: "agent/state/config-runtime-sample-status-classifier.generated.json",
  docPath: "docs/agent-truth/config-runtime-sample-status-classifier.md",
  build: buildConfigRuntimeSampleStatusClassifierReport,
  validate: validateConfigRuntimeSampleStatusClassifierReport,
});

