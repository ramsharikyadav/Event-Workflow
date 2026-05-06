export type UserRole = 'admin' | 'orderer' | 'vendor' | 'storeManager' | 'accounts' | 'endUser';
export type OrderStatus = 'pending' | 'approved' | 'ordered' | 'received' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed';

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel?: number;
  imageUrl?: string;
  description?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  materialId: string;
  materialName: string;
  materialImageUrl?: string;
  requiredDate?: string;
  requiredTime?: string;
  quantity: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  orderedBy: string;
  orderedByName: string;
  teamId: string;
  deliveredTo?: string;
  handoverRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  orderId: string;
  materialId: string;
  quantityReceived: number;
  photoUrl?: string;
  receivedBy: string;
  receivedAt: string;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[]; // UIDs
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
}
