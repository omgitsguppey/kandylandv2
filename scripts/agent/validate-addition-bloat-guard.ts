import { runValidation } from "./validate-agent-takeover-safety-check";

// The bloat contract validates measured changes from the retained task baseline.
if (require.main === module) runValidation("bloat");
