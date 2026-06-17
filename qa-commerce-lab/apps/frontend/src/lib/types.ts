export type User = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceInCents: number;
  stock: number;
  imageUrl: string;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: Product;
};

export type Order = {
  id: string;
  totalInCents: number;
  createdAt: string;
};
