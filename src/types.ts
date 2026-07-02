export interface TicketData {
  id: string;
  stt: number;
  agentId: string;
  pnr: string;
  ticketNumber: string;
  ticketType: string;
  productType: string;
  salesChannel: string;
  qty: number;
  itinerary: string;
  domInt: 'ND' | 'QT';
  carrier: string;
  ticketClass: string;
  supplier: string;
  issueDate: string;
  reportDate: string;
  price: string;
  tax: string;
  fee: string;
  vatRate: string;
  vatAmount: string;
  provisionalPrice: string;
  serviceFee: string;
  payable: string;
  commission: string;
  refundFee: string;
  totalPrice: string;
  supplierPrice: string;
  subAgentCode: string;
  notes: string;
  bookerCode: string;
}

export interface TransactionRow {
  stt: number;
  agentId: string;
  documentType: string;
  documentDate: string;
  issueDate: string;
  orderCode: string;
  description: string;
  salePrice: string;
  discount: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export interface Campaign {
  id: number;
  name: string;
  carrier?: string | null;
  valid_from?: string | null; // YYYY-MM-DD
  valid_to?: string | null; // YYYY-MM-DD
  departure_date_from?: string | null; // YYYY-MM-DD
  departure_date_to?: string | null; // YYYY-MM-DD
  excluded_first_tag?: string | null;
  group: number | null;
  index: number | null;
  channel?: 'PARTNER' | 'FLIGHTVN' | 'ALL' | null;
  ticket?: boolean | null;
}

export interface CampaignBlackoutPeriod {
  id: number;
  campaign_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  type: 'BOOKING' | 'FLY';
}

export interface CampaignDetail {
  id: number;
  campaign_id: number;
  booking_class: string[];
  discount_base: 'FARE' | 'NET';
  discount_percentage: number;
  amount: number | null;
  groups_tag: string[];
  index?: number | null;
}

export interface Policy {
  id: number;
  name: string;
  thresholds: string[]; // TEXT[] containing threshold IDs as strings
  agents?: string[] | null;
  index?: number | null;
}

export interface Threshold {
  id: number;
  campaign_id: number | null;
  threshold_value: number;
  if_greater_value: number;
  if_less_value: number;
  tag?: string | null;
}


export interface Airport {
  id: number;
  city: string;
  iata: string;
  airport_name: string;
  country: string;
  continent: string;
  tags: string[];
}

