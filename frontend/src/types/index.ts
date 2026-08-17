export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type ItemType = 'lost' | 'found';
export type ItemStatus = 'lost' | 'found' | 'return_pending' | 'returned';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ClaimStatus = 'pending' | 'more_info' | 'approved' | 'rejected' | 'escalated' | 'closed' | 'returned';

export interface User {
  id: string;
  fullName: string;
  email: string;
  college: string;
  studentId: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface ItemImage {
  id?: string;
  url: string;
  position: number;
}

export interface Poster {
  id: string;
  name: string;
  college: string;
  avatarUrl: string | null;
  studentId: string | null;
  joinedAt: string;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  college: string;
  avatarUrl: string | null;
  bio: string | null;
  studentIdMasked: string | null;
  joinedAt: string;
  successfulReturns: number;
  activeListings: number;
}

export interface Item {
  id: string;
  uid: string;
  type: ItemType;
  status: ItemStatus;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  date_incident: string | null;
  time_approx: string | null;
  location: string | null;
  location_details: string | null;
  current_location: string | null;
  private_identifying_features: string | null;
  reward: string | null;
  notes: string | null;
  category_id: number;
  user_id?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  returned_at?: string | null;
  category_name?: string;
  category_slug?: string;
  cover_url?: string | null;
  images?: ItemImage[];
  poster?: Poster;
  possibleMatches?: MatchResult[];
  claims?: ClaimSummary[];
}

export interface MatchResult {
  score: number;
  reasons: string[];
  item: Item;
}

export interface ClaimSummary {
  id: string;
  uid: string;
  item_id: string;
  item_name?: string;
  item_uid?: string;
  item_type?: ItemType;
  item_status?: ItemStatus;
  item_cover?: string | null;
  item_private_features?: string | null;
  claimant_id: string;
  claimant_name?: string;
  claimant_college?: string;
  claimant_avatar?: string | null;
  claimant_student_id?: string | null;
  risk_level: RiskLevel;
  status: ClaimStatus;
  lost_location: string | null;
  lost_date: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  unique_feature: string | null;
  proof_of_ownership: string | null;
  proof_urls: string[];
  additional_info: string | null;
  finder_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  verification_questions?: VerificationQuestion[];
}

export interface VerificationQuestion {
  id: string;
  question: string;
}

export interface ClaimDetail extends ClaimSummary {
  item_user_id?: string;
  item_cover?: string | null;
  item_private_features?: string | null;
  answers?: { question: string; answer: string }[];
  handover?: Handover | null;
  canReview?: boolean;
  viewerRole?: 'finder' | 'claimant' | 'admin' | null;
  claimant?: {
    id?: string | null;
    name?: string;
    college?: string;
    avatarUrl?: string | null;
    joinedAt?: string;
    successfulReturns?: number;
    totalItems?: number;
    studentId?: string | null;
  };
}

export interface Handover {
  id: string;
  claim_id: string;
  pickup_location: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notes: string | null;
  finder_confirmed_at: string | null;
  claimant_accepted_at: string | null;
  claimant_confirmed_at: string | null;
  declined_at: string | null;
  status: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  item_id: string;
  item_name: string;
  item_uid: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'rejected';
  reporter_id: string;
  reporter_name?: string;
  resolution_note: string | null;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  college: string;
  role: Role;
  status: UserStatus;
  item_count: number;
  claim_count: number;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalLost: number;
  totalFound: number;
  returned: number;
  activeClaims: number;
  pendingReports: number;
  suspendedUsers: number;
  successRate: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: string;
}