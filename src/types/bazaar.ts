export interface BazaarPair {
  id: string;
  member1Id: string;
  member2Id: string;
  isActive: boolean; // Whether this pair is in the rotation
  createdAt: string;
  member1Name?: string; // Hydrated
  member2Name?: string; // Hydrated
}

export interface BazaarItem {
  name: string;
  qty?: string;
  cost: number;
  isExtra?: boolean;
  checked?: boolean;
}

export interface BazaarAssignment {
  id: string;
  userId: string;
  member2Id?: string; // Second assigned member for double member bajar duty
  date: string; // YYYY-MM-DD
  shoppingList: string[]; // Items the manager requests
  budget?: number; // Manager assigned budget for the bajar
  allocatedCash?: number; // Cash handed over by manager
  returnedCash?: number; // Cash returned to mess
  items?: BazaarItem[]; // Itemized checklist
  status: 'pending' | 'submitted' | 'verified' | 'skipped';
  submittedAt?: string;
  submittedBy?: string; // userId of member who submitted the actual cost
  delegatedFrom?: string; // userId of the person who delegated this to someone else
  bazaarPairId?: string; // Links to a BazaarPair
  verifiedAt?: string;
  verifiedBy?: string;
  userName?: string; // Hydrated Member 1
  member2Name?: string; // Hydrated Member 2
}

export interface BazaarExpense {
  id: string;
  assignmentId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  allocatedCash?: number;
  returnedCash?: number;
  items: BazaarItem[];
  totalCost: number;
  receiptImage?: string; // Optional base64 or URL
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  userName?: string; // Hydrated
}

export interface BazaarActivityDetail {
  userId: string;
  userName: string;
  totalCost: number;
  items: string;
  status: string;
}

export interface BazaarDutyInfo {
  hasDuty: boolean;
  date: string;
  pairPartnerName?: string;
  shoppingList?: string[];
  budget?: number;
  assignmentId?: string;
  status?: string;
  submittedDetails?: {
    submittedByName?: string;
    totalCost?: number;
    items?: { name: string; cost: number }[];
    submittedAt?: string;
  };
  messShoppers?: {
    member1Name: string;
    member2Name?: string;
    budget?: number;
    status?: string;
  };
}
