import { DealStage } from '@prisma/client';

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  NEW: 0.1,
  QUALIFIED: 0.25,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.75,
  WON: 1.0,
  LOST: 0.0,
} as const;

export interface DealOwnerSummary {
  id: string;
  name: string;
  email: string;
}

export interface DealCompanySummary {
  id: string;
  name: string;
  industry: string;
  isArchived: boolean;
}

export interface DealCollaboratorSummary {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SafeUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CollaboratorResponse {
  dealId: string;
  userId: string;
  createdAt: Date;
  user: SafeUserSummary;
}

export interface AddCollaboratorInput {
  userId: string;
}

export interface AddNoteInput {
  note: string;
}

export interface DealHistoryResponse {
  id: string;
  dealId: string;
  actorId: string;
  type: string;
  oldStage: DealStage | null;
  newStage: DealStage | null;
  oldOwnerId: string | null;
  newOwnerId: string | null;
  collaboratorId: string | null;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  actor?: SafeUserSummary;
  collaborator?: SafeUserSummary | null;
  oldOwner?: SafeUserSummary | null;
  newOwner?: SafeUserSummary | null;
}

export interface DealResponse {
  id: string;
  teamId: string;
  companyId: string;
  ownerId: string;
  title: string;
  value: string; // Exact decimal string: "125000.50"
  weightedValue: string; // Exact derived decimal string: "62500.25"
  expectedCloseDate: string; // "YYYY-MM-DD"
  stage: DealStage;
  stageProbability: number; // e.g. 0.10, 0.25, 0.50, 0.75, 1.00, 0.00
  previousStage: DealStage | null;
  closedAt: Date | null;
  deletedAt: Date | null;
  deletedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: DealCompanySummary;
  owner?: DealOwnerSummary;
  collaborators?: DealCollaboratorSummary[];
}

export interface CreateDealInput {
  title: string;
  companyId: string;
  value: string;
  expectedCloseDate: string;
  ownerId?: string;
}

export interface UpdateDealInput {
  title?: string;
  companyId?: string;
  value?: string;
  expectedCloseDate?: string;
  ownerId?: string;
}

export interface TransitionStageInput {
  stage: DealStage;
  reason?: string;
}

export interface DealListQuery {
  stage?: DealStage;
  ownerId?: string;
  companyId?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: 'title' | 'value' | 'expectedCloseDate' | 'stage' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

export interface DealListResponse {
  deals: DealResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
