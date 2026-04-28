export type ProfileData = {
  id: number;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  listings_count: number;
  services_count: number;
  events_count: number;
};

export type ListingItem = {
  id: string;
  title: string;
  price: number | null;
  is_free: number;
  status?: string;
  image_url: string | null;
  created_at?: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  price: number | null;
  price_type: string | null;
  image_url: string | null;
  created_at?: string;
};

export type EventItem = {
  id: string;
  title: string;
  starts_at: string;
  is_free: number;
  ticket_price: number | null;
  image_url: string | null;
  created_at?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: number;
  content: string;
  sender_name: string;
  read_at: string | null;
  created_at: string;
};

export type RatingItem = {
  id: number;
  transaction_id: string;
  reviewer_id: number;
  reviewee_id: number;
  stars: number;
  body: string | null;
  created_at: string;
  reviewer_name: string | null;
};

export type Conversation = {
  id: string;
  listing_id: string | null;
  service_id: string | null;
  event_id: string | null;
  buyer_id: number;
  seller_id: number;
  partner_id: number;
  partner_name: string;
  partner_avatar: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number;
  listing_title: string | null;
  listing_price: number | null;
  listing_is_free: number | null;
  listing_image: string | null;
  service_title: string | null;
  service_price: number | null;
  service_image: string | null;
  event_title: string | null;
};
