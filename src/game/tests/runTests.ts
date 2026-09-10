import {
  runRulesTests
} from "./RulesTest";

import {
  runRangeRulesTests
} from "./RangeRulesTest";

import {
  runPathfindingTests
} from "./PathfindingTest";

import {
  runFiveFootStepTests
} from "./FiveFootStepTest";

import {
  runStabilizationTests
} from "./StabilizationTest";

import {
  runSavingThrowTests
} from "./SavingThrowTest";

import {
  runConditionStateTests
} from "./ConditionStateTest";

import {
  runDisabledStateTests
} from "./DisabledStateTest";

import {
  runHitPointTransitionTests
} from "./HitPointTransitionTest";

import {
  runCoupDeGraceTests
} from "./CoupDeGraceTest";

import {
  runCoupDeGraceIntegrationTests
} from "./CoupDeGraceIntegrationTest";

import {
  runCombatResolutionTests
} from "./CombatResolutionTest";

import {
  runSocialRulesTests
} from "./SocialRulesTest";

import {
  runAITests
} from "./AITest";

import {
  runCombatMovementTests
} from "./CombatMovementTest";

import {
  runWithdrawRulesTests
} from "./WithdrawRulesTest";

import {
  runCombatMovementIntegrationTests
} from "./CombatMovementIntegrationTest";

import {
  runGameCoreServerIntegrationTests
} from "./GameCoreServerIntegrationTest";

runRulesTests();
runRangeRulesTests();
runPathfindingTests();
runFiveFootStepTests();
runStabilizationTests();
runSavingThrowTests();
runConditionStateTests();
runDisabledStateTests();
runHitPointTransitionTests();
runCoupDeGraceTests();
runCoupDeGraceIntegrationTests();
runCombatResolutionTests();
runSocialRulesTests();
runAITests();
runCombatMovementTests();
runWithdrawRulesTests();
runCombatMovementIntegrationTests();
await runGameCoreServerIntegrationTests();
