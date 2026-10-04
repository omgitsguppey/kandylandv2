import { runValidation } from "./validate-agent-takeover-safety-check";

// Current knowledge has one coordinated takeover owner.
if (require.main === module) runValidation("knowledge");
