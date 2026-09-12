export type DealStage = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  NEW: 0.1,
  QUALIFIED: 0.25,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.75,
  WON: 1.0,
  LOST: 0.0,
};

export const STAGE_LABELS: Record<DealStage, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export const STAGE_ORDER: DealStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

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

export interface SafeUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface DealCollaboratorSummary {
  userId: string;
  user: SafeUserSummary;
}

export interface CollaboratorResponse {
  dealId: string;
  userId: string;
  createdAt: string;
  user: SafeUserSummary;
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
  createdAt: string;
  actor?: SafeUserSummary;
  collaborator?: SafeUserSummary | null;
  oldOwner?: SafeUserSummary | null;
  newOwner?: SafeUserSummary | null;
}

export interface Deal {
  id: string;
  teamId: string;
  companyId: string;
  ownerId: string;
  title: string;
  value: string; // Exact decimal string: "125000.50"
  weightedValue: string; // Exact decimal string: "62500.25"
  expectedCloseDate: string; // "YYYY-MM-DD"
  stage: DealStage;
  stageProbability: number;
  previousStage: DealStage | null;
  closedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  stage?: DealStage | 'ALL';
  ownerId?: string;
  companyId?: string;
  search?: string;
  isReopened?: boolean;
  page?: number;
  pageSize?: number;
  limit?: number;
  sortBy?: 'value' | 'expectedCloseDate' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DealPaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DealListResponse {
  deals: Deal[];
  pagination: DealPaginationMeta;
}

export interface BulkResultItem {
  dealId: string;
  status: 'success' | 'failed';
  reason?: string;
  message?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  results: BulkResultItem[];
  summary: {
    requested: number;
    succeeded: number;
    failed: number;
  };
}
