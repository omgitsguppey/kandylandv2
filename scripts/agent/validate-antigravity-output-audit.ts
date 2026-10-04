import { runValidation } from "./validate-agent-takeover-safety-check";

// Current scope enforcement replaces the historical identity-compile incident.
if (require.main === module) runValidation("output");
