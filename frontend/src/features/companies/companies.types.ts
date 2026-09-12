export interface CompanyOwnerSummary {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface SimilarCompany {
  id: string;
  name: string;
  industry: string;
  owner: CompanyOwnerSummary;
  activeDealsCount: number;
}

export interface Company {
  id: string;
  teamId: string;
  ownerId: string;
  name: string;
  industry: string;
  website: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  owner: CompanyOwnerSummary;
  _count?: {
    deals: number;
  };
}

export interface CreateCompanyInput {
  name: string;
  industry: string;
  website?: string | null;
  ownerId?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  industry?: string;
  website?: string | null;
  ownerId?: string;
}

export interface CompanyListQuery {
  isArchived?: 'false' | 'true' | 'all';
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'industry' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompanyListResponse {
  companies: Company[];
  pagination: PaginationMeta;
}
