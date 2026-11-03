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

/** 건물 — supplies the BB segment of the asset number. */
export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  // 2자리 숫자, 0 으로 채움 ('01'). 자리수를 고정해야 문자열 정렬이 번호 순서가 됩니다.
  code: varchar('code', { length: 2 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/** 사역원 — supplies the DD segment of the asset number. */
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 2 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/**
 * 엑셀 일괄 등록 한 번 = 한 묶음.
 *
 * 묶음을 남기는 이유는 **되돌리기** 때문입니다. 잘못 올린 수백 건을 하나씩 지우는
 * 것은 현실적이지 않고, 자산번호는 폐기해도 재사용하지 않으므로 잘못 만든 번호는
 * 완전 삭제로만 회수됩니다.
 */
export const importBatches = pgTable('import_batches', {
  id: serial('id').primaryKey(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  rowCount: integer('row_count').notNull(),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable(
  'assets',
  {
    id: serial('id').primaryKey(),

    // 자산번호: YY-BBDD-SSSS (e.g. 26-0103-0001). Stored whole for lookups, and
    // split into parts so filtering and sorting by building/department stay
    // cheap. 규칙은 `src/lib/asset-no.ts` 한 곳에 있습니다.
    assetNo: varchar('asset_no', { length: 16 }).notNull(),
    yearCode: varchar('year_code', { length: 2 }).notNull(),
    buildingCode: varchar('building_code', { length: 2 }).notNull(),
    deptCode: varchar('dept_code', { length: 2 }).notNull(),
    seq: varchar('seq', { length: 4 }).notNull(),

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

    /**
     * 엑셀 일괄 등록으로 만들어진 자산이면 그 묶음. 손으로 등록한 자산은 null 입니다.
     * 묶음을 지워도(`set null`) 자산은 남습니다 — 되돌리기는 자산을 먼저 지웁니다.
     */
    importBatchId: integer('import_batch_id').references(() => importBatches.id, {
      onDelete: 'set null',
    }),

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
    // 일괄 등록 되돌리기가 묶음 단위로 긁습니다.
    index('assets_import_batch_idx').on(table.importBatchId),
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
export type ImportBatch = typeof importBatches.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
