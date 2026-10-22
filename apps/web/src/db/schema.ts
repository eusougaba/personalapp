// Mapeamento Drizzle das tabelas criadas em db/migrations (nomes no padrão do banco).
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { precision: 3, mode: "date" });

export const platformPlanTier = pgEnum("PlatformPlanTier", ["START", "PRO", "STUDIO"]);
export const platformSubStatus = pgEnum("PlatformSubStatus", ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]);
export const role = pgEnum("Role", ["PLATFORM_ADMIN", "OWNER", "TRAINER", "STUDENT"]);
export const studentStatus = pgEnum("StudentStatus", ["INVITED", "ACTIVE", "PAUSED", "INACTIVE"]);
export const planType = pgEnum("PlanType", ["RECURRING", "PACKAGE", "SINGLE", "ONLINE"]);
export const billingInterval = pgEnum("BillingInterval", ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY"]);
export const subscriptionStatus = pgEnum("SubscriptionStatus", ["ACTIVE", "PAUSED", "CANCELED"]);
export const paymentMethod = pgEnum("PaymentMethod", ["PIX", "CREDIT_CARD", "BOLETO", "CASH", "OTHER"]);
export const invoiceStatus = pgEnum("InvoiceStatus", ["PENDING", "PAID", "OVERDUE", "CANCELED", "REFUNDED"]);
export const ledgerType = pgEnum("LedgerType", ["INCOME", "EXPENSE"]);
export const sessionStatus = pgEnum("SessionStatus", ["SCHEDULED", "DONE", "CANCELED", "MISSED"]);

export const tenants = pgTable("Tenant", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  logoUrl: text("logoUrl"),
  iconUrl: text("iconUrl"),
  primaryColor: text("primaryColor").notNull().default("#111827"),
  accentColor: text("accentColor").notNull().default("#22C55E"),
  fontFamily: text("fontFamily"),
  paymentsEnabled: boolean("paymentsEnabled").notNull().default(false),
  providerAccountId: text("providerAccountId"),
  providerWalletId: text("providerWalletId"),
  feePassThrough: boolean("feePassThrough").notNull().default(false),
  platformFeeBps: integer("platformFeeBps").notNull().default(150),
  whatsapp: text("whatsapp"),
  pixKey: text("pixKey"),
  bio: text("bio"),
  cref: text("cref"),
  createdAt: ts("createdAt").notNull().defaultNow(),
  updatedAt: ts("updatedAt").notNull(),
});

export const platformSubscriptions = pgTable("PlatformSubscription", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  tier: platformPlanTier("tier").notNull().default("START"),
  status: platformSubStatus("status").notNull().default("TRIALING"),
  priceCents: integer("priceCents").notNull(),
  trialEndsAt: ts("trialEndsAt"),
  providerSubId: text("providerSubId"),
  currentPeriodEnd: ts("currentPeriodEnd"),
});

export const users = pgTable("User", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  phone: text("phone"),
  emailVerified: ts("emailVerified"),
  image: text("image"),
  passwordHash: text("passwordHash"),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export const memberships = pgTable("Membership", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  tenantId: text("tenantId").notNull(),
  role: role("role").notNull(),
});

export const students = pgTable("Student", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  userId: text("userId"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  birthDate: ts("birthDate"),
  status: studentStatus("status").notNull().default("INVITED"),
  notes: text("notes"),
  goal: text("goal"),
  providerCustomerId: text("providerCustomerId"),
  healthDataConsentAt: ts("healthDataConsentAt"),
  inviteToken: text("inviteToken"),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export const plans = pgTable("Plan", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: planType("type").notNull(),
  priceCents: integer("priceCents").notNull(),
  interval: billingInterval("interval"),
  sessionsPerWeek: integer("sessionsPerWeek"),
  sessionsTotal: integer("sessionsTotal"),
  validityDays: integer("validityDays"),
  dueDay: integer("dueDay"),
  discountPct: integer("discountPct"),
  lateFeePct: integer("lateFeePct"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export const subscriptions = pgTable("StudentSubscription", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  studentId: text("studentId").notNull(),
  planId: text("planId").notNull(),
  status: subscriptionStatus("status").notNull().default("ACTIVE"),
  priceCents: integer("priceCents").notNull(),
  startDate: ts("startDate").notNull(),
  endDate: ts("endDate"),
  sessionsLeft: integer("sessionsLeft"),
  providerSubId: text("providerSubId"),
});

export const invoices = pgTable("Invoice", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  studentId: text("studentId").notNull(),
  subscriptionId: text("subscriptionId"),
  description: text("description").notNull(),
  amountCents: integer("amountCents").notNull(),
  dueDate: ts("dueDate").notNull(),
  status: invoiceStatus("status").notNull().default("PENDING"),
  method: paymentMethod("method"),
  paidAt: ts("paidAt"),
  gatewayFeeCents: integer("gatewayFeeCents"),
  platformFeeCents: integer("platformFeeCents"),
  netCents: integer("netCents"),
  providerPaymentId: text("providerPaymentId"),
  paymentUrl: text("paymentUrl"),
  manual: boolean("manual").notNull().default(false),
  notes: text("notes"),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export const ledgerEntries = pgTable("LedgerEntry", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  type: ledgerType("type").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  amountCents: integer("amountCents").notNull(),
  date: ts("date").notNull(),
  invoiceId: text("invoiceId"),
});

export const webhookEvents = pgTable("WebhookEvent", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("providerEventId").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: ts("processedAt"),
  error: text("error"),
  receivedAt: ts("receivedAt").notNull().defaultNow(),
});

export const classSessions = pgTable("ClassSession", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  startsAt: ts("startsAt").notNull(),
  endsAt: ts("endsAt").notNull(),
  location: text("location"),
  online: boolean("online").notNull().default(false),
  status: sessionStatus("status").notNull().default("SCHEDULED"),
  recurrence: text("recurrence"),
  title: text("title"),
  notes: text("notes"),
});

export const attendances = pgTable("Attendance", {
  id: text("id").primaryKey(),
  sessionId: text("sessionId").notNull(),
  studentId: text("studentId").notNull(),
  present: boolean("present"),
  makeUp: boolean("makeUp").notNull().default(false),
});

export const exercises = pgTable("Exercise", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId"),
  name: text("name").notNull(),
  muscleGroup: text("muscleGroup"),
  videoUrl: text("videoUrl"),
  instructions: text("instructions"),
});

export const workouts = pgTable("Workout", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  studentId: text("studentId").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export const workoutItems = pgTable("WorkoutItem", {
  id: text("id").primaryKey(),
  workoutId: text("workoutId").notNull(),
  exerciseId: text("exerciseId").notNull(),
  order: integer("order").notNull(),
  sets: integer("sets"),
  reps: text("reps"),
  load: text("load"),
  restSeconds: integer("restSeconds"),
  notes: text("notes"),
});

export const workoutLogs = pgTable("WorkoutLog", {
  id: text("id").primaryKey(),
  workoutId: text("workoutId").notNull(),
  completedAt: ts("completedAt").notNull().defaultNow(),
  effort: integer("effort"),
  comment: text("comment"),
});

export const assessments = pgTable("Assessment", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").notNull(),
  studentId: text("studentId").notNull(),
  date: ts("date").notNull(),
  weightKg: numeric("weightKg", { precision: 5, scale: 2 }),
  bodyFatPct: numeric("bodyFatPct", { precision: 4, scale: 1 }),
  measures: jsonb("measures").$type<Record<string, number>>(),
  photoKeys: text("photoKeys").array(),
  notes: text("notes"),
});

export const auditLogs = pgTable("AuditLog", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId"),
  userId: text("userId"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entityId"),
  meta: jsonb("meta"),
  createdAt: ts("createdAt").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
