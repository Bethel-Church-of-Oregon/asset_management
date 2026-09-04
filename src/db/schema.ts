import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const ASSET_STATUSES = ['in_use', 'idle', 'repair', 'disposed'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const USER_ROLES = ['admin', 'manager', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MAINTENANCE_KINDS = ['inspection', 'repair'] as const;
export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number];

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // 로그인 아이디. 규칙은 `src/lib/username.ts` 한 곳에 있습니다.
  username: varchar('username', { length: 30 }).notNull().unique(),
  // 연락처용 선택 항목입니다 — 로그인에는 쓰이지 않습니다. 빈 값은 NULL 로 저장하세요
  // (빈 문자열을 넣으면 unique 제약이 두 번째 계정에서 걸립니다).
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('viewer').$type<UserRole>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 건물/위치 — supplies the 3rd digit of the asset number. */
export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 1 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/** 관리 사역원 — supplies the 4th digit of the asset number. */
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 1 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const assets = pgTable(
  'assets',
  {
    id: serial('id').primaryKey(),

    // 자산번호: YY-BDSSS (e.g. 26-11001). Stored whole for lookups, and split
    // into parts so filtering and sorting by building/department stay cheap.
    assetNo: varchar('asset_no', { length: 16 }).notNull(),
    yearCode: varchar('year_code', { length: 2 }).notNull(),
    buildingCode: varchar('building_code', { length: 1 }).notNull(),
    deptCode: varchar('dept_code', { length: 1 }).notNull(),
    seq: varchar('seq', { length: 3 }).notNull(),

    name: varchar('name', { length: 200 }).notNull(),
    teamName: varchar('team_name', { length: 100 }),
    location: varchar('location', { length: 200 }),

    acquiredDate: date('acquired_date'),
    // 달러는 센트가 있으므로 scale 2. 원화 기준의 scale 0 이면 $1,299.99 를 담지 못합니다.
    acquiredPrice: numeric('acquired_price', { precision: 14, scale: 2 }),

    manufacturer: varchar('manufacturer', { length: 120 }),
    modelName: varchar('model_name', { length: 160 }),
    serialNo: varchar('serial_no', { length: 160 }),
    spec: text('spec'),

    vendor: varchar('vendor', { length: 160 }),
    quantity: integer('quantity').notNull().default(1),

    status: varchar('status', { length: 20 }).notNull().default('in_use').$type<AssetStatus>(),

    // 특이사항
    donor: varchar('donor', { length: 120 }),
    warrantyUntil: date('warranty_until'),
    notes: text('notes'),

    // 폐기 기록
    disposedDate: date('disposed_date'),
    disposalReason: varchar('disposal_reason', { length: 200 }),
    disposalNote: text('disposal_note'),

    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('assets_asset_no_key').on(table.assetNo),
    index('assets_status_idx').on(table.status),
    index('assets_building_idx').on(table.buildingCode),
    index('assets_dept_idx').on(table.deptCode),
    index('assets_name_idx').on(table.name),
    // Backs "next sequence number" lookups when registering an asset.
    index('assets_prefix_idx').on(table.yearCode, table.buildingCode, table.deptCode),
  ],
);

export const maintenanceLogs = pgTable(
  'maintenance_logs',
  {
    id: serial('id').primaryKey(),
    assetId: integer('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 20 }).notNull().default('repair').$type<MaintenanceKind>(),
    performedOn: date('performed_on').notNull(),
    description: text('description').notNull(),
    cost: numeric('cost', { precision: 14, scale: 2 }),
    vendor: varchar('vendor', { length: 160 }),
    performedBy: varchar('performed_by', { length: 120 }),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('maintenance_asset_idx').on(table.assetId, table.performedOn)],
);

export const assetsRelations = relations(assets, ({ many, one }) => ({
  maintenanceLogs: many(maintenanceLogs),
  creator: one(users, { fields: [assets.createdBy], references: [users.id] }),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  asset: one(assets, { fields: [maintenanceLogs.assetId], references: [assets.id] }),
}));

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
