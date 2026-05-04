import { setupServer } from "msw/node";

import { kandyDropsMockHandlers } from "./handlers";

export const server = setupServer(...kandyDropsMockHandlers);

export {
  getActiveKandyDropsMockScenario,
  kandyDropsMswScenarioNames,
  resetKandyDropsMockScenario,
  setKandyDropsMockScenario,
} from "./handlers";
