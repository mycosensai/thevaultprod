import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// ─── USERS ───
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  unionId: text("unionId").unique(),
  oauthProvider: text("oauth_provider"),
  oauthProviderId: text("oauth_provider_id"),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  password: text("password"),
  role: text("role").default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CATEGORIES ───
export const categories = sqliteTable("categories", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  description: text("description"),
  listingCount: integer("listing_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Category = typeof categories.$inferSelect;

// ─── LISTINGS ───
export const listings = sqliteTable("listings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull(),
  sellerId: integer("seller_id"),
  price: text("price").notNull(),
  commissionRate: text("commission_rate").default("5.00").notNull(),
  condition: text("condition").default("very_good"),
  status: text("status").default("active").notNull(),
  badge: text("badge").default("none"),
  images: text("images"),
  features: text("features"),
  appraisalId: integer("appraisal_id"),
  isBuyNow: integer("is_buy_now", { mode: "boolean" }).default(true),
  isConsignment: integer("is_consignment", { mode: "boolean" }).default(false),
  viewCount: integer("view_count").default(0).notNull(),
  isCertified: integer("is_certified", { mode: "boolean" }).default(false),
  tokenContractAddress: text("token_contract_address"),
  certificationId: integer("certification_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;

// ─── APPRAISALS ───
export const appraisals = sqliteTable("appraisals", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  condition: text("condition"),
  description: text("description"),
  imageUrl: text("image_url"),
  estimatedValue: text("estimated_value"),
  valueRangeLow: text("value_range_low"),
  valueRangeHigh: text("value_range_high"),
  confidence: text("confidence").default("medium"),
  marketAnalysis: text("market_analysis"),
  comparableSales: text("comparable_sales"),
  status: text("status").default("pending").notNull(),
  commissionEstimate: text("commission_estimate"),
  commissionRate: text("commission_rate"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Appraisal = typeof appraisals.$inferSelect;
export type InsertAppraisal = typeof appraisals.$inferInsert;

// ─── CART ITEMS ───
export const cartItems = sqliteTable("cart_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  listingId: integer("listing_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  offerPrice: text("offer_price"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type CartItem = typeof cartItems.$inferSelect;

// ─── STRIPE SESSIONS ───
export const stripeSessions = sqliteTable("stripe_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id"),
  listingId: integer("listing_id").notNull(),
  amount: text("amount").notNull(),
  commission: text("commission").notNull(),
  status: text("status").default("pending").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── AI AGENT LOGS ───
export const aiAgentLogs = sqliteTable("ai_agent_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  agentName: text("agent_name").notNull(),
  agentType: text("agent_type").default("general").notNull(),
  listingId: integer("listing_id"),
  status: text("status").default("queued").notNull(),
  input: text("input"),
  output: text("output"),
  confidence: text("confidence"),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── BLOCKCHAIN CERTIFICATES ───
export const blockchainCerts = sqliteTable("blockchain_certs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  userId: integer("user_id"),
  certificateHash: text("certificate_hash").notNull().unique(),
  contractAddress: text("contract_address"),
  tokenId: text("token_id"),
  blockHash: text("block_hash"),
  blockNumber: integer("block_number"),
  network: text("network").default("ethereum_sepolia"),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description"),
  metadataUri: text("metadata_uri"),
  status: text("status").default("pending").notNull(),
  certificationFee: text("certification_fee").default("0.002"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type BlockchainCert = typeof blockchainCerts.$inferSelect;

// ─── CRYPTO PAYMENTS ───
export const cryptoPayments = sqliteTable("crypto_payments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  userId: integer("user_id"),
  buyerAddress: text("buyer_address").notNull(),
  sellerAddress: text("seller_address"),
  amount: text("amount").notNull(),
  amountUsd: text("amount_usd").notNull(),
  currency: text("currency").default("ETH").notNull(),
  network: text("network").default("ethereum_sepolia"),
  txHash: text("tx_hash").unique(),
  blockHash: text("block_hash"),
  blockNumber: integer("block_number"),
  status: text("status").default("pending").notNull(),
  confirmations: integer("confirmations").default(0),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type CryptoPayment = typeof cryptoPayments.$inferSelect;

// ─── COMMISSION TIERS ───
export const commissionTiers = sqliteTable("commission_tiers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  minAmount: text("min_amount").notNull(),
  maxAmount: text("max_amount"),
  rate: text("rate").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── COINBASE CHARGES ───
export const coinbaseCharges = sqliteTable("coinbase_charges", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  userId: integer("user_id"),
  coinbaseChargeId: text("coinbase_charge_id").notNull().unique(),
  coinbaseCode: text("coinbase_code"),
  coinbaseHostedUrl: text("coinbase_hosted_url"),
  amount: text("amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  status: text("status").default("pending").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type CoinbaseCharge = typeof coinbaseCharges.$inferSelect;

// ─── OUTREACH CAMPAIGNS ───
export const outreachCampaigns = sqliteTable("outreach_campaigns", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id"),
  applicationId: integer("application_id"),
  userId: integer("user_id"),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  targetProfessionals: integer("target_professionals").default(5).notNull(),
  foundLeads: integer("found_leads").default(0).notNull(),
  outreachCount: integer("outreach_count").default(0).notNull(),
  status: text("status").default("running").notNull(),
  aiStrategy: text("ai_strategy"),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── OUTREACH LOGS ───
export const outreachLogs = sqliteTable("outreach_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id").notNull(),
  expertId: integer("expert_id"),
  professionalName: text("professional_name"),
  professionalTitle: text("professional_title"),
  institution: text("institution"),
  email: text("email"),
  specialty: text("specialty"),
  outreachMethod: text("outreach_method").default("ai_search"),
  message: text("message"),
  response: text("response"),
  status: text("status").default("pending").notNull(),
  confidence: integer("confidence").default(50),
  attemptNumber: integer("attempt_number").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── PROFESSIONAL LEADS ───
export const professionalLeads = sqliteTable("professional_leads", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id").notNull(),
  listingId: integer("listing_id"),
  applicationId: integer("application_id"),
  userId: integer("user_id"),
  outreachLogId: integer("outreach_log_id"),
  expertId: integer("expert_id"),
  name: text("name").notNull(),
  title: text("title"),
  institution: text("institution"),
  email: text("email"),
  specialty: text("specialty"),
  interestLevel: text("interest_level").default("interested"),
  estimatedOffer: text("estimated_offer"),
  notes: text("notes"),
  contactMessage: text("contact_message"),
  isDelivered: integer("is_delivered", { mode: "boolean" }).default(false),
  deliveredAt: integer("delivered_at", { mode: "timestamp" }),
  status: text("status").default("active").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── EXPERT PROFILES ───
export const expertProfiles = sqliteTable("expert_profiles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  email: text("email"),
  institution: text("institution"),
  location: text("location"),
  specialties: text("specialties"),
  credentials: text("credentials"),
  yearsExperience: integer("years_experience").default(0),
  reviewCount: integer("review_count").default(0),
  rating: text("rating").default("5.0"),
  avatar: text("avatar"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ExpertProfile = typeof expertProfiles.$inferSelect;

// ─── EXPERT APPLICATIONS ───
export const expertApplications = sqliteTable("expert_applications", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  condition: text("condition"),
  description: text("description"),
  provenance: text("provenance"),
  dimensions: text("dimensions"),
  materials: text("materials"),
  markings: text("markings"),
  imageUrls: text("image_urls"),
  estimatedValue: text("estimated_value"),
  status: text("status").default("submitted").notNull(),
  assignedExpertIds: text("assigned_expert_ids"),
  reviewFee: text("review_fee").default("49.99"),
  priority: text("priority").default("standard"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ExpertApplication = typeof expertApplications.$inferSelect;

// ─── EXPERT REVIEWS ───
export const expertReviews = sqliteTable("expert_reviews", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull(),
  expertId: integer("expert_id").notNull(),
  authenticityScore: integer("authenticity_score").notNull(),
  valueScore: integer("value_score").notNull(),
  conditionScore: integer("condition_score").notNull(),
  overallScore: text("overall_score").notNull(),
  estimatedValue: text("estimated_value"),
  valueRangeLow: text("value_range_low"),
  valueRangeHigh: text("value_range_high"),
  authenticityVerdict: text("authenticity_verdict").default("uncertain"),
  conditionNotes: text("condition_notes"),
  authenticityNotes: text("authenticity_notes"),
  valueNotes: text("value_notes"),
  methodology: text("methodology"),
  comparableSales: text("comparable_sales"),
  isPublished: integer("is_published", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ExpertReview = typeof expertReviews.$inferSelect;

// ─── EXPERT CONSENSUS ───
export const expertConsensus = sqliteTable("expert_consensus", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().unique(),
  consensusAuthenticity: text("consensus_authenticity").notNull(),
  consensusValue: text("consensus_value").notNull(),
  consensusCondition: text("consensus_condition").notNull(),
  consensusOverall: text("consensus_overall").notNull(),
  consensusVerdict: text("consensus_verdict").default("uncertain"),
  estimatedValueLow: text("estimated_value_low"),
  estimatedValueHigh: text("estimated_value_high"),
  expertCount: integer("expert_count").default(0),
  summaryReport: text("summary_report"),
  certificateUrl: text("certificate_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ExpertConsensus = typeof expertConsensus.$inferSelect;

// ═══════════════════════════════════════════════
// RETAIL FEATURES
// ═══════════════════════════════════════════════

// ─── REVIEWS ───
export const reviews = sqliteTable("reviews", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  isVerifiedPurchase: integer("is_verified_purchase", { mode: "boolean" }).default(false),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Review = typeof reviews.$inferSelect;

// ─── WISHLIST ───
export const wishlistItems = sqliteTable("wishlist_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  listingId: integer("listing_id").notNull(),
  sessionId: text("session_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type WishlistItem = typeof wishlistItems.$inferSelect;

// ─── ORDERS ───
export const orders = sqliteTable("orders", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  listingId: integer("listing_id").notNull(),
  listingTitle: text("listing_title").notNull(),
  listingImage: text("listing_image"),
  amount: text("amount").notNull(),
  commission: text("commission").default("0.00"),
  paymentMethod: text("payment_method").default("other"),
  paymentStatus: text("payment_status").default("pending"),
  orderStatus: text("order_status").default("pending"),
  shippingAddress: text("shipping_address"),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Order = typeof orders.$inferSelect;

// ─── NEWSLETTER ───
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  isSubscribed: integer("is_subscribed", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// ─── RECENTLY VIEWED ───
export const recentlyViewed = sqliteTable("recently_viewed", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  listingId: integer("listing_id").notNull(),
  viewedAt: integer("viewed_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type RecentlyViewed = typeof recentlyViewed.$inferSelect;

// ═══════════════════════════════════════════════
// AGENT SYSTEM (GeneralStaff-style autonomous operations)
// ═══════════════════════════════════════════════

// ─── AGENT PROJECTS (website business units) ───
export const agentProjects = sqliteTable("agent_projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  mode: text("mode").default("A").notNull(),
  priority: integer("priority").default(2).notNull(),
  engineerCommand: text("engineer_command"),
  verificationCommand: text("verification_command"),
  cycleBudgetMinutes: integer("cycle_budget_minutes").default(15).notNull(),
  workDetection: text("work_detection").default("tasks_json").notNull(),
  concurrencyDetection: text("concurrency_detection").default("none").notNull(),
  branch: text("branch").default("bot/work").notNull(),
  autoMerge: integer("auto_merge", { mode: "boolean" }).default(false).notNull(),
  handsOff: text("hands_off").default("[]").notNull(),
  providerId: text("provider_id").default("openai").notNull(),
  model: text("model").default("gpt-4o").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentProject = typeof agentProjects.$inferSelect;

// ─── AGENT TASKS (GS-style task queue) ───
export const agentTasks = sqliteTable("agent_tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskId: text("task_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  status: text("status").default("pending").notNull(),
  priority: integer("priority").default(2).notNull(),
  interactiveOnly: integer("interactive_only", { mode: "boolean" }).default(false).notNull(),
  expectedTouches: text("expected_touches").default("[]").notNull(),
  description: text("description"),
  assignedAgent: text("assigned_agent"),
  cycleId: text("cycle_id"),
  result: text("result"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export type AgentTask = typeof agentTasks.$inferSelect;

// ─── AGENT CYCLES (engineer->verify->review pipeline) ───
export const agentCycles = sqliteTable("agent_cycles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  cycleId: text("cycle_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  sessionId: text("session_id"),
  taskId: text("task_id").notNull(),
  status: text("status").default("running").notNull(),
  outcome: text("outcome"),
  engineerOutput: text("engineer_output"),
  verificationOutput: text("verification_output"),
  reviewOutput: text("review_output"),
  reviewVerdict: text("review_verdict"),
  startSha: text("start_sha"),
  endSha: text("end_sha"),
  durationSeconds: integer("duration_seconds"),
  scopeDriftFiles: text("scope_drift_files").default("[]").notNull(),
  handsOffViolations: text("hands_off_violations").default("[]").notNull(),
  silentFailures: text("silent_failures").default("[]").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export type AgentCycle = typeof agentCycles.$inferSelect;

// ─── AGENT SESSIONS (batch of cycles) ───
export const agentSessions = sqliteTable("agent_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  status: text("status").default("active").notNull(),
  stopReason: text("stop_reason"),
  totalCycles: integer("total_cycles").default(0).notNull(),
  totalVerified: integer("total_verified").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  durationMinutes: integer("duration_minutes"),
  reviewer: text("reviewer"),
  maxParallelSlots: integer("max_parallel_slots"),
  parallelRounds: integer("parallel_rounds"),
  slotIdleSeconds: integer("slot_idle_seconds"),
  parallelEfficiency: real("parallel_efficiency"),
  startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export type AgentSession = typeof agentSessions.$inferSelect;

// ─── AGENT LOGS (PROGRESS.jsonl equivalent) ───
export const agentLogs = sqliteTable("agent_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  event: text("event").notNull(),
  cycleId: text("cycle_id"),
  sessionId: text("session_id"),
  projectId: text("project_id").notNull(),
  taskId: text("task_id"),
  data: text("data").default("{}").notNull(),
});
export type AgentLog = typeof agentLogs.$inferSelect;

// ─── AI PROVIDERS ───
export const agentProviders = sqliteTable("agent_providers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  providerId: text("provider_id").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").default("openai").notNull(),
  model: text("model").notNull(),
  apiKey: text("api_key"),
  baseUrl: text("base_url"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentProvider = typeof agentProviders.$inferSelect;

// ─── FLEET STATE (aggregated counters) ───
export const agentFleetState = sqliteTable("agent_fleet_state", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull().unique(),
  totalCycles: integer("total_cycles").default(0).notNull(),
  totalVerified: integer("total_verified").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  accumulatedMinutes: integer("accumulated_minutes").default(0).notNull(),
  lastCycleAt: integer("last_cycle_at", { mode: "timestamp" }),
  lastCycleOutcome: text("last_cycle_outcome"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentFleetState = typeof agentFleetState.$inferSelect;

// ─── INBOX / OUTBOX MESSAGES ───
export const agentMessages = sqliteTable("agent_messages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  messageId: text("message_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  sessionId: text("session_id"),
  from: text("from").notNull(),
  kind: text("kind").default("fyi").notNull(),
  body: text("body").notNull(),
  refs: text("refs").default("[]").notNull(),
  processed: integer("processed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentMessage = typeof agentMessages.$inferSelect;


// ─── LISTING FEES ───
export const listingFees = sqliteTable("listing_fees", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  listingId: integer("listing_id"),
  stripeSessionId: text("stripe_session_id"),
  amount: text("amount").default("20.00").notNull(),
  status: text("status").default("pending").notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ListingFee = typeof listingFees.$inferSelect;

// ─── SOCIAL MEDIA SEARCHES ───
export const socialMediaSearches = sqliteTable("social_media_searches", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  userId: integer("user_id"),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  platformsSearched: text("platforms_searched"),
  searchQuery: text("search_query"),
  status: text("status").default("pending").notNull(),
  totalMentionsFound: integer("total_mentions_found").default(0),
  leadsWithContact: integer("leads_with_contact").default(0),
  aiSummary: text("ai_summary"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SocialMediaSearch = typeof socialMediaSearches.$inferSelect;

// ─── SOCIAL MEDIA MENTIONS ───
export const socialMediaMentions = sqliteTable("social_media_mentions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  searchId: integer("search_id").notNull(),
  listingId: integer("listing_id").notNull(),
  platform: text("platform").notNull(),
  postUrl: text("post_url"),
  postContent: text("post_content"),
  authorUsername: text("author_username"),
  authorDisplayName: text("author_display_name"),
  authorProfileUrl: text("author_profile_url"),
  authorBio: text("author_bio"),
  publicEmail: text("public_email"),
  publicWebsite: text("public_website"),
  publicLocation: text("public_location"),
  followersCount: integer("followers_count"),
  postDate: integer("post_date", { mode: "timestamp" }),
  engagementScore: integer("engagement_score").default(0),
  relevanceScore: integer("relevance_score").default(50),
  aiNotes: text("ai_notes"),
  isContacted: integer("is_contacted", { mode: "boolean" }).default(false),
  contactMethod: text("contact_method"),
  status: text("status").default("new").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SocialMediaMention = typeof socialMediaMentions.$inferSelect;

// ─── SHIPPING QUOTES ───
export const shippingQuotes = sqliteTable("shipping_quotes", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  sellerId: integer("seller_id"),
  buyerId: integer("buyer_id"),
  carrier: text("carrier").notNull(),
  serviceLevel: text("service_level"),
  estimatedCost: text("estimated_cost"),
  estimatedDays: integer("estimated_days"),
  originZip: text("origin_zip"),
  destinationZip: text("destination_zip"),
  packageWeight: text("package_weight"),
  packageDimensions: text("package_dimensions"),
  insuranceAmount: text("insurance_amount"),
  isInsured: integer("is_insured", { mode: "boolean" }).default(false),
  quoteData: text("quote_data"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ShippingQuote = typeof shippingQuotes.$inferSelect;

// ─── SALE TRANSACTIONS ───
export const saleTransactions = sqliteTable("sale_transactions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  buyerId: integer("buyer_id"),
  buyerEmail: text("buyer_email"),
  buyerName: text("buyer_name"),
  salePrice: text("sale_price").notNull(),
  commissionRate: text("commission_rate").default("5.00").notNull(),
  commissionAmount: text("commission_amount").notNull(),
  sellerPayout: text("seller_payout").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  status: text("status").default("pending").notNull(),
  shippingCarrier: text("shipping_carrier"),
  shippingTrackingNumber: text("shipping_tracking_number"),
  shippingQuoteId: integer("shipping_quote_id"),
  shippedAt: integer("shipped_at", { mode: "timestamp" }),
  deliveredAt: integer("delivered_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SaleTransaction = typeof saleTransactions.$inferSelect;

// ─── SELLER PAYOUTS ───
export const sellerPayouts = sqliteTable("seller_payouts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sellerId: integer("seller_id").notNull(),
  saleTransactionId: integer("sale_transaction_id").notNull(),
  amount: text("amount").notNull(),
  stripePayoutId: text("stripe_payout_id"),
  status: text("status").default("pending").notNull(),
  method: text("method").default("stripe_transfer"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SellerPayout = typeof sellerPayouts.$inferSelect;

// ─── EMAIL NOTIFICATIONS ───
export const emailNotifications = sqliteTable("email_notifications", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  recipientEmail: text("recipient_email").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  metadata: text("metadata"),
  status: text("status").default("pending").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type EmailNotification = typeof emailNotifications.$inferSelect;
// ─── SYSTEM SETTINGS (Samson kill switch, global config) ───
export const systemSettings = sqliteTable("system_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;

// ─── AGENT WORKFLOWS (inter-agent collaboration threads) ───
export const agentWorkflows = sqliteTable("agent_workflows", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  workflowId: text("workflow_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  participatingAgents: text("participating_agents").default("[]").notNull(),
  currentStep: integer("current_step").default(0).notNull(),
  totalSteps: integer("total_steps").default(0).notNull(),
  stepData: text("step_data").default("{}").notNull(),
  createdBy: text("created_by").default("system").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export type AgentWorkflow = typeof agentWorkflows.$inferSelect;

// ─── PARTNERSHIP OUTREACH (cold outreach to companies/competitors) ───
export const partnershipOutreach = sqliteTable("partnership_outreach", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  outreachId: text("outreach_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  website: text("website"),
  industry: text("industry").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactTitle: text("contact_title"),
  outreachMethod: text("outreach_method").default("email").notNull(),
  messageBody: text("message_body").notNull(),
  status: text("status").default("draft").notNull(),
  priority: integer("priority").default(2).notNull(),
  assignedAgent: text("assigned_agent").default("outreach").notNull(),
  responseNotes: text("response_notes"),
  followUpDate: integer("follow_up_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
});
export type PartnershipOutreach = typeof partnershipOutreach.$inferSelect;

// ─── AGENT FEEDBACK LOOP (learns from mistakes) ───
export const agentFeedback = sqliteTable("agent_feedback", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  feedbackId: text("feedback_id").notNull().unique(),
  cycleId: text("cycle_id").notNull(),
  projectId: text("project_id").notNull(),
  taskId: text("task_id").notNull(),
  originalOutput: text("original_output").notNull(),
  issue: text("issue").notNull(), // hallucination, boundary_violation, poor_quality, incorrect_format, censorship_violation
  correction: text("correction").notNull(),
  severity: text("severity").notNull(), // minor, major, critical
  learned: integer("learned", { mode: "boolean" }).default(false).notNull(),
  appliedToCycles: integer("applied_to_cycles").default(0).notNull(), // how many times this feedback was injected into prompts
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentFeedback = typeof agentFeedback.$inferSelect;

// ─── AGENT BOUNDARY LOG (violations and enforcement) ───
export const agentBoundaryLog = sqliteTable("agent_boundary_log", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  cycleId: text("cycle_id").notNull(),
  projectId: text("project_id").notNull(),
  taskId: text("task_id").notNull(),
  violationType: text("violation_type").notNull(),
  details: text("details").notNull(),
  blocked: integer("blocked", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentBoundaryLog = typeof agentBoundaryLog.$inferSelect;
// ─── BOXED-IN RESEARCH SYSTEM ───
// Internet research findings — strictly limited to buyer discovery and social media
export const internetResearch = sqliteTable("internet_research", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  researchId: text("research_id").notNull().unique(),
  listingId: integer("listing_id"),
  itemName: text("item_name").notNull(),
  category: text("category"),
  query: text("query").notNull(),
  platform: text("platform").notNull(), // reddit, x, forum, google, etc.
  sourceUrl: text("source_url"),
  title: text("title"),
  content: text("content"),
  author: text("author"),
  authorUrl: text("author_url"),
  postDate: text("post_date"),
  relevanceScore: integer("relevance_score").default(50),
  confidenceScore: integer("confidence_score").default(50),
  aiNotes: text("ai_notes"),
  // BOXED-IN tags
  findingType: text("finding_type").default("discussion"), // discussion, wtb, fs, review, collection_showcase
  isBuyingSignal: integer("is_buying_signal", { mode: "boolean" }).default(false),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  safetyFlags: text("safety_flags").default("[]"),
  // Metadata
  foundByAgent: text("found_by_agent").default("research"),
  foundAt: integer("found_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type InternetResearch = typeof internetResearch.$inferSelect;

// ─── AGENT CONVERSATIONS (inter-agent chat) ───
// Agents discuss findings, share insights, build on each other's work
// STRICTLY BOXED IN to buyer-finding and item research topics
export const agentConversations = sqliteTable("agent_conversations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  conversationId: text("conversation_id").notNull().unique(),
  listingId: integer("listing_id"),
  itemName: text("item_name").notNull(),
  topic: text("topic").notNull(), // e.g., "buyer_discovery", "market_research", "social_scan"
  // Message content
  fromAgent: text("from_agent").notNull(), // e.g., "outreach", "social", "content"
  toAgent: text("to_agent").default("all"), // "all" = broadcast, or specific agent ID
  message: text("message").notNull(),
  messageType: text("message_type").default("insight"), // insight, question, alert, finding, opinion, correction
  // BOXED-IN safety tracking
  boundaryChecks: text("boundary_checks").default("[]"), // JSON array of passed/failed checks
  topicVerified: integer("topic_verified", { mode: "boolean" }).default(false),
  safetyScore: integer("safety_score").default(100), // 0-100, lower = more flags
  // Source references (for transparency)
  sources: text("sources").default("[]"), // JSON array of {url, title, confidence}
  relatedResearchId: text("related_research_id"), // Links to internet_research
  // Metadata
  parentMessageId: text("parent_message_id"), // For threading/replies
  threadDepth: integer("thread_depth").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AgentConversation = typeof agentConversations.$inferSelect;

// ─── RESEARCH SESSIONS (tracks a research job) ───
export const researchSessions = sqliteTable("research_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  listingId: integer("listing_id"),
  itemName: text("item_name").notNull(),
  category: text("category"),
  status: text("status").default("running").notNull(), // running, paused, completed, failed
  triggerAgent: text("trigger_agent").default("outreach"),
  participatingAgents: text("participating_agents").default("[]"),
  totalFindings: integer("total_findings").default(0),
  buyingSignals: integer("buying_signals").default(0),
  boundaryViolations: integer("boundary_violations").default(0),
  summaryReport: text("summary_report"),
  startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export type ResearchSession = typeof researchSessions.$inferSelect;

// ─── SELF-AUDITING SYSTEM ───
// 24/7 autonomous audit agent logs all checks and auto-fixes
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  auditId: text("audit_id").notNull().unique(),
  agentName: text("agent_name").default("auditor"),
  checkType: text("check_type").notNull(), // integrity, security, performance, hallucination, data_quality, schema
  severity: text("severity").default("info").notNull(), // info, warning, error, critical
  finding: text("finding").notNull(),
  details: text("details").default("{}"),
  autoFixed: integer("auto_fixed", { mode: "boolean" }).default(false),
  fixApplied: text("fix_applied"),
  fixResult: text("fix_result"),
  requiresHumanReview: integer("requires_human_review", { mode: "boolean" }).default(false),
  checkedAt: integer("checked_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;

// ─── INTER-AGENT POLICING ───
// Agents cross-verify each other's output
export const interAgentChecks = sqliteTable("inter_agent_checks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  checkId: text("check_id").notNull().unique(),
  fromAgent: text("from_agent").notNull(),
  targetAgent: text("target_agent").notNull(),
  targetOutput: text("target_output"), // The output being reviewed
  checkType: text("check_type").notNull(), // hallucination, accuracy, scope_drift, boundary_violation, tone
  verdict: text("verdict").default("pending").notNull(), // pass, fail, warning, pending
  issuesFound: text("issues_found").default("[]"),
  correctionSuggested: text("correction_suggested"),
  wasCorrected: integer("was_corrected", { mode: "boolean" }).default(false),
  correctionApplied: text("correction_applied"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type InterAgentCheck = typeof interAgentChecks.$inferSelect;

// ─── ACCOUNTING / AUTO-BOOKS ───
// Every financial transaction and agent action is logged
export const accountingEntries = sqliteTable("accounting_entries", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  entryId: text("entry_id").notNull().unique(),
  entryType: text("entry_type").notNull(), // listing_fee, sale, commission, payout, refund, agent_cost, subscription, other
  source: text("source").default("system").notNull(), // system, agent, manual, stripe
  sourceId: text("source_id"), // ID of the triggering record
  description: text("description").notNull(),
  amountCents: integer("amount_cents").default(0),
  currency: text("currency").default("USD"),
  metadata: text("metadata").default("{}"),
  itemName: text("item_name"),
  category: text("category"),
  agentName: text("agent_name"), // Which agent triggered this, if any
  performedBy: text("performed_by").default("system"), // system, user, or agent name
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AccountingEntry = typeof accountingEntries.$inferSelect;

// ─── DAILY REPORTS ───
// 9PM daily digest sent to admin
export const dailyReports = sqliteTable("daily_reports", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  reportId: text("report_id").notNull().unique(),
  reportDate: text("report_date").notNull(), // YYYY-MM-DD
  status: text("status").default("generated").notNull(), // generated, sent, read
  salesSummary: text("sales_summary").default("{}"),
  agentActivity: text("agent_activity").default("{}"),
  outreachSummary: text("outreach_summary").default("{}"),
  auditFindings: text("audit_findings").default("[]"),
  accountingSummary: text("accounting_summary").default("{}"),
  securityChecks: text("security_checks").default("[]"),
  userActions: text("user_actions").default("[]"),
  alerts: text("alerts").default("[]"),
  fullReport: text("full_report"), // Complete markdown/text report
  sentAt: integer("sent_at", { mode: "timestamp" }),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type DailyReport = typeof dailyReports.$inferSelect;

// ─── USER WORKFLOWS ───
// Email workflow tracking — next steps for users with agent prompt integration
export const userWorkflows = sqliteTable("user_workflows", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  workflowId: text("workflow_id").notNull().unique(),
  userEmail: text("user_email"),
  userId: integer("user_id"),
  triggerType: text("trigger_type").notNull(), // sell, appraise, verify, tokenize, register, purchase
  itemName: text("item_name"),
  currentStep: integer("current_step").default(1),
  totalSteps: integer("total_steps").default(5),
  stepData: text("step_data").default("{}"), // JSON: {steps: [...], current: n}
  emailSent: integer("email_sent", { mode: "boolean" }).default(false),
  emailOpened: integer("email_opened", { mode: "boolean" }).default(false),
  userPromptedAgent: integer("user_prompted_agent", { mode: "boolean" }).default(false),
  userPromptText: text("user_prompt_text"),
  agentResponse: text("agent_response"),
  status: text("status").default("active").notNull(), // active, completed, abandoned, paused
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type UserWorkflow = typeof userWorkflows.$inferSelect;

// ─── SECURITY HARDENING LOG ───
// Auto-discovered security improvements
export const securityHardening = sqliteTable("security_hardening", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  hardeningId: text("hardening_id").notNull().unique(),
  agentName: text("agent_name").default("security_auditor"),
  checkType: text("check_type").notNull(), // xss, injection, csrf, headers, rate_limit, input_validation, cors
  finding: text("finding").notNull(),
  recommendation: text("recommendation"),
  severity: text("severity").default("info").notNull(),
  wasImplemented: integer("was_implemented", { mode: "boolean" }).default(false),
  implementationNotes: text("implementation_notes"),
  checkedAt: integer("checked_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type SecurityHardening = typeof securityHardening.$inferSelect;

// ─── ADMIN PROMPT QUEUE ───
// Admin's prompt override box — agents drop everything when admin prompts arrive
export const adminPromptQueue = sqliteTable("admin_prompt_queue", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  promptId: text("prompt_id").notNull().unique(),
  promptText: text("prompt_text").notNull(),
  targetAgent: text("target_agent").default("all"), // all or specific agent name
  priority: integer("priority").default(100).notNull(), // 100 = highest (admin override)
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  result: text("result"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type AdminPromptQueue = typeof adminPromptQueue.$inferSelect;

// ─── COLD EMAIL SYSTEM (from n8n workflow) ───
// Niche-specific email templates generated by AI
export const coldEmailTemplates = sqliteTable("cold_email_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  templateId: text("template_id").notNull().unique(),
  niche: text("niche").notNull(), // dentist, realestate, luxury_collectibles, etc.
  subject: text("subject").notNull(),
  body: text("body").notNull(), // contains {NAME} placeholder
  createdBy: text("created_by").default("ai_agent"),
  status: text("status").default("active").notNull(), // active, archived
  useCount: integer("use_count").default(0),
  avgResponseRate: integer("avg_response_rate").default(0), // 0-100
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ColdEmailTemplate = typeof coldEmailTemplates.$inferSelect;

// Prospects / leads to email
export const coldEmailProspects = sqliteTable("cold_email_prospects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  prospectId: text("prospect_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  niche: text("niche").notNull(),
  company: text("company"),
  title: text("title"),
  website: text("website"),
  source: text("source").default("manual"), // manual, ai_research, import, referral
  status: text("status").default("pending").notNull(), // pending, sent, opened, replied, bounced, unsubscribed
  sentAt: integer("sent_at", { mode: "timestamp" }),
  openedAt: integer("opened_at", { mode: "timestamp" }),
  repliedAt: integer("replied_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ColdEmailProspect = typeof coldEmailProspects.$inferSelect;

// Individual email sends with tracking
export const coldEmailSends = sqliteTable("cold_email_sends", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sendId: text("send_id").notNull().unique(),
  prospectId: text("prospect_id").notNull(),
  templateId: text("template_id").notNull(),
  campaignId: text("campaign_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // personalized with actual name
  niche: text("niche").notNull(),
  status: text("status").default("queued").notNull(), // queued, sending, sent, delivered, opened, replied, bounced, failed
  gmailMessageId: text("gmail_message_id"),
  errorMessage: text("error_message"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  deliveredAt: integer("delivered_at", { mode: "timestamp" }),
  openedAt: integer("opened_at", { mode: "timestamp" }),
  repliedAt: integer("replied_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type ColdEmailSend = typeof coldEmailSends.$inferSelect;

// Marketing analytics / website traffic
export const marketingAnalytics = sqliteTable("marketing_analytics", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // pageview, click, conversion, signup, listing_view, appraisal_request, purchase, outreach_open, outreach_click
  page: text("page"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"), // hashed IP for privacy
  userId: integer("user_id"),
  sessionId: text("session_id"),
  metadata: text("metadata").default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type MarketingAnalytic = typeof marketingAnalytics.$inferSelect;

// ─── SECURITY STATE (D1-backed rate limiting & token revocation) ───
export const rateLimitCounters = sqliteTable("rate_limit_counters", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
  lastSeen: integer("last_seen").notNull(),
});
export type RateLimitCounter = typeof rateLimitCounters.$inferSelect;

export const revokedTokens = sqliteTable("revoked_tokens", {
  token: text("token").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type RevokedToken = typeof revokedTokens.$inferSelect;

export const userSessionRevocations = sqliteTable("user_session_revocations", {
  userId: integer("user_id").primaryKey(),
  revokedAt: integer("revoked_at").notNull(),
});
export type UserSessionRevocation = typeof userSessionRevocations.$inferSelect;
