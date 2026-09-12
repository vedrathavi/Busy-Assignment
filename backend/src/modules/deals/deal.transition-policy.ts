import { DealStage } from '@prisma/client';

export interface TransitionValidationResult {
  legal: boolean;
  error?: string;
  isClosing?: boolean;
  isBackward?: boolean;
}

export interface ReopenValidationResult {
  legal: boolean;
  error?: string;
  targetStage?: DealStage;
}

export const OPEN_STAGES: readonly DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
] as const;

export class DealTransitionPolicy {
  private static readonly FORWARD_MAP: Partial<Record<DealStage, DealStage | DealStage[]>> = {
    [DealStage.NEW]: DealStage.QUALIFIED,
    [DealStage.QUALIFIED]: DealStage.PROPOSAL,
    [DealStage.PROPOSAL]: DealStage.NEGOTIATION,
    [DealStage.NEGOTIATION]: [DealStage.WON, DealStage.LOST],
  };

  private static readonly BACKWARD_MAP: Partial<Record<DealStage, DealStage>> = {
    [DealStage.QUALIFIED]: DealStage.NEW,
    [DealStage.PROPOSAL]: DealStage.QUALIFIED,
    [DealStage.NEGOTIATION]: DealStage.PROPOSAL,
  };

  /**
   * Pure state machine function evaluating whether a stage transition is legal.
   * - 1-step forward moves are valid without a reason.
   * - 1-step backward moves are valid ONLY with a non-empty reason.
   * - Closed deals (WON/LOST) cannot be transitioned normally.
   * - Stage skipping and multi-step backward jumps are strictly rejected.
   */
  isTransitionLegal(
    currentStage: DealStage,
    targetStage: DealStage,
    reason?: string
  ): TransitionValidationResult {
    // 1. Same-stage check
    if (currentStage === targetStage) {
      return {
        legal: false,
        error: `Deal is already in stage '${currentStage}'`,
      };
    }

    // 2. Closed deal protection
    if (currentStage === DealStage.WON || currentStage === DealStage.LOST) {
      return {
        legal: false,
        error: 'Closed deals cannot be transitioned. A manager must reopen the deal first.',
      };
    }

    // 3. Evaluate forward 1-step transitions
    const forwardTarget = DealTransitionPolicy.FORWARD_MAP[currentStage];
    const isForward = Array.isArray(forwardTarget)
      ? forwardTarget.includes(targetStage)
      : forwardTarget === targetStage;

    if (isForward) {
      const isClosing = targetStage === DealStage.WON || targetStage === DealStage.LOST;
      if (targetStage === DealStage.LOST) {
        if (!reason || reason.trim().length === 0) {
          return {
            legal: false,
            error: 'A non-empty reason is required when marking a deal as Lost',
          };
        }
      }
      return {
        legal: true,
        isClosing,
        isBackward: false,
      };
    }

    // 4. Evaluate backward 1-step transitions
    const backwardTarget = DealTransitionPolicy.BACKWARD_MAP[currentStage];
    const isBackward = backwardTarget === targetStage;

    if (isBackward) {
      if (!reason || reason.trim().length === 0) {
        return {
          legal: false,
          error: 'A non-empty reason is required when moving a deal backward',
        };
      }
      return {
        legal: true,
        isClosing: false,
        isBackward: true,
      };
    }

    // 5. Invalid transition (skipping stages or multi-step backward jumps)
    return {
      legal: false,
      error: `Invalid stage transition from '${currentStage}' to '${targetStage}'. Moves must be exactly one step forward or backward.`,
    };
  }

  /**
   * Evaluates whether a closed deal can be reopened.
   * Reopen restores the deal back to its recorded previousStage before close.
   * Defensively enforces that previousStage must be a valid open stage (NEW, QUALIFIED, PROPOSAL, NEGOTIATION).
   */
  canReopen(currentStage: DealStage, previousStage: DealStage | null): ReopenValidationResult {
    if (currentStage !== DealStage.WON && currentStage !== DealStage.LOST) {
      return {
        legal: false,
        error: `Only closed deals (WON or LOST) can be reopened. Current stage is '${currentStage}'.`,
      };
    }

    if (!previousStage) {
      return {
        legal: false,
        error: 'Cannot reopen deal: no previous stage was recorded prior to closing.',
      };
    }

    if (!OPEN_STAGES.includes(previousStage)) {
      return {
        legal: false,
        error: `Invalid previous stage '${previousStage}': deal cannot be reopened into a closed stage. Target must be an open stage (NEW, QUALIFIED, PROPOSAL, NEGOTIATION).`,
      };
    }

    return {
      legal: true,
      targetStage: previousStage,
    };
  }

  /**
   * Pure evaluation of bulk advance target for a given current stage.
   * - NEW -> QUALIFIED
   * - QUALIFIED -> PROPOSAL
   * - PROPOSAL -> NEGOTIATION
   * - NEGOTIATION -> requires explicit target stage (WON or LOST); bulk advance does not guess.
   * - WON / LOST -> closed deals cannot be transitioned.
   */
  getBulkAdvanceTarget(currentStage: DealStage): {
    canAdvance: boolean;
    targetStage?: DealStage;
    reason?: string;
    message?: string;
  } {
    if (currentStage === DealStage.WON || currentStage === DealStage.LOST) {
      return {
        canAdvance: false,
        reason: 'DEAL_CLOSED',
        message: 'Closed deals cannot be transitioned.',
      };
    }

    if (currentStage === DealStage.NEGOTIATION) {
      return {
        canAdvance: false,
        reason: 'TRANSITION_REQUIRES_TARGET',
        message: 'Advancing from NEGOTIATION requires an explicit target stage (WON or LOST).',
      };
    }

    const forwardTarget = DealTransitionPolicy.FORWARD_MAP[currentStage];
    if (forwardTarget && typeof forwardTarget === 'string') {
      return {
        canAdvance: true,
        targetStage: forwardTarget as DealStage,
      };
    }

    return {
      canAdvance: false,
      reason: 'INVALID_TRANSITION',
      message: `No forward advance available from stage '${currentStage}'.`,
    };
  }
}

export const dealTransitionPolicy = new DealTransitionPolicy();
