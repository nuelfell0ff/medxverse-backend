export enum OrganizationType {
  HOSPITAL = 'HOSPITAL',
  HMO = 'HMO',
}

export interface IOrganization {
  _id: string;
  name: string;
  code: string; // Unique slug/code (e.g. HOSP-001, HMO-LEXI)
  type: OrganizationType;
  email: string;
  phone: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}