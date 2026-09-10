export interface CompanyOwnerSummary {
  id: string;
  name: string;
  email: string;
}

export interface CompanyResponse {
  id: string;
  teamId: string;
  ownerId: string;
  name: string;
  industry: string;
  website: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  page: number;
  limit: number;
  sortBy: 'name' | 'industry' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

export interface CompanyListResponse {
  companies: CompanyResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
