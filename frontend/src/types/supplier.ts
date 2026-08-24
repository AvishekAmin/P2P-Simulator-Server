export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  rating: number; // 0-5
  reliabilityScore: number; // 0-1
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  supplierProducts?: SupplierProduct[];
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  category: string;
  description?: string | null;
  unit: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  unitPricePaise: number;
  currency: string;
  stockQuantity: number;
  deliveryDays: number;
  minOrderQuantity: number;
  createdAt: string;
  updatedAt?: string;
  supplier?: Supplier;
  product?: Product;
}
