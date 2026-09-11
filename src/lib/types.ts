export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ReportSummary = {
  total_orders: number;
  total_revenue: number;
  total_items_sold: number;
  by_product: { product_name: string; quantity: number; revenue: number }[];
  by_category?: { category_name: string; quantity: number; revenue: number }[];
};

export type Banner = {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Offer = {
  // One active offer per product (upsert is based on product_id)
  product_id: string;
  offer_price: number;
  // Discount percentage (e.g. 20 means 20% off)
  percent_off: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductOffer = {
  offer_price: number;
  percent_off: number;
  is_active: boolean;
};

export type ProductWithOffer = Product & {
  offer?: ProductOffer;
};
