import 'server-only';

import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  ASSET_STATUSES,
  assets,
  buildings,
  departments,
  maintenanceLogs,
  users,
  type AssetStatus,
} from '@/db/schema';
import { SEQ_MAX, assetNoFragment, normalizeAssetNo, toYearCode } from './asset-no';
import { PAGE_SIZE } from './constants';
import { currentYear } from './format';

export type Lookups = {
  buildings: { id: number; code: string; name: string; isActive: boolean }[];
  departments: { id: number; code: string; name: string; isActive: boolean }[];
};

export async function getLookups(includeInactive = false): Promise<Lookups> {
  const [buildingRows, deptRows] = await Promise.all([
    db
      .select({
        id: buildings.id,
        code: buildings.code,
        name: buildings.name,
        isActive: buildings.isActive,
      })
      .from(buildings)
      .where(includeInactive ? undefined : eq(buildings.isActive, true))
      .orderBy(asc(buildings.sortOrder), asc(buildings.code)),
    db
      .select({
        id: departments.id,
        code: departments.code,
        name: departments.name,
        isActive: departments.isActive,
      })
      .from(departments)
      .where(includeInactive ? undefined : eq(departments.isActive, true))
      .orderBy(asc(departments.sortOrder), asc(departments.code)),
  ]);
  return { buildings: buildingRows, departments: deptRows };
}

export type AssetListParams = {
  q?: string;
  status?: string;
  building?: string;
  dept?: string;
  year?: string;
  sort?: string;
  page?: number;
};

const SORTS: Record<string, SQL[]> = {
  no_desc: [
    desc(assets.yearCode),
    desc(assets.buildingCode),
    desc(assets.deptCode),
    desc(assets.seq),
  ],
  no_asc: [asc(assets.yearCode), asc(assets.buildingCode), asc(assets.deptCode), asc(assets.seq)],
  name_asc: [asc(assets.name)],
  recent: [desc(assets.createdAt)],
  price_desc: [sql`${assets.acquiredPrice} desc nulls last`],
  acquired_desc: [sql`${assets.acquiredDate} desc nulls last`],
};

function buildAssetFilters(params: AssetListParams): SQL[] {
  const filters: SQL[] = [];
  const q = params.q?.trim();

  if (q) {
    const like = `%${q}%`;
    const fragment = assetNoFragment(q);
    const conditions = [
      ilike(assets.name, like),
      ilike(assets.teamName, like),
      ilike(assets.location, like),
      ilike(assets.manufacturer, like),
      ilike(assets.modelName, like),
      ilike(assets.serialNo, like),
      ilike(assets.vendor, like),
      ilike(assets.donor, like),
      ilike(assets.notes, like),
      ilike(assets.assetNo, like),
    ];
    // Also match numbers typed or scanned without the hyphen ("2611001").
    if (fragment) {
      conditions.push(sql`replace(${assets.assetNo}, '-', '') like ${`%${fragment}%`}`);
    }
    filters.push(or(...conditions)!);
  }

  if (params.status && (ASSET_STATUSES as readonly string[]).includes(params.status)) {
    filters.push(eq(assets.status, params.status as AssetStatus));
  } else if (params.status === 'active') {
    // "폐기 제외" — the default view for day-to-day use.
    filters.push(sql`${assets.status} <> 'disposed'`);
  }

  if (params.building) filters.push(eq(assets.buildingCode, params.building));
  if (params.dept) filters.push(eq(assets.deptCode, params.dept));
  if (params.year) filters.push(eq(assets.yearCode, params.year));

  return filters;
}

export type AssetListRow = {
  id: number;
  assetNo: string;
  name: string;
  teamName: string | null;
  location: string | null;
  status: AssetStatus;
  acquiredDate: string | null;
  acquiredPrice: string | null;
  manufacturer: string | null;
  modelName: string | null;
  serialNo: string | null;
  quantity: number;
  buildingName: string | null;
  deptName: string | null;
};

export async function listAssets(params: AssetListParams) {
  const filters = buildAssetFilters(params);
  const where = filters.length > 0 ? and(...filters) : undefined;
  const page = Math.max(1, params.page ?? 1);
  const orderBy = SORTS[params.sort ?? 'no_desc'] ?? SORTS.no_desc;

  const selectPage = (targetPage: number) =>
    db
      .select({
        id: assets.id,
        assetNo: assets.assetNo,
        name: assets.name,
        teamName: assets.teamName,
        location: assets.location,
        status: assets.status,
        acquiredDate: assets.acquiredDate,
        acquiredPrice: assets.acquiredPrice,
        manufacturer: assets.manufacturer,
        modelName: assets.modelName,
        serialNo: assets.serialNo,
        quantity: assets.quantity,
        buildingName: buildings.name,
        deptName: departments.name,
      })
      .from(assets)
      .leftJoin(buildings, eq(buildings.code, assets.buildingCode))
      .leftJoin(departments, eq(departments.code, assets.deptCode))
      .where(where)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset((targetPage - 1) * PAGE_SIZE);

  const [firstRows, totalResult] = await Promise.all([
    selectPage(page),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(where),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Asking for a page past the end (a stale link, a hand-edited URL) would
  // otherwise render the "nothing registered yet" empty state even though the
  // search has results. Clamp to the last page and re-read — the extra query
  // only runs in that edge case, so the common path stays a single round trip.
  let rows = firstRows;
  let resolvedPage = page;
  if (rows.length === 0 && total > 0 && page > pageCount) {
    resolvedPage = pageCount;
    rows = await selectPage(resolvedPage);
  }

  return {
    rows: rows as AssetListRow[],
    total,
    page: resolvedPage,
    pageCount,
  };
}

/** Every matching id, ignoring pagination — used by "전체 라벨 출력" and CSV export. */
export async function listAssetIds(params: AssetListParams, limit = 2000): Promise<number[]> {
  const filters = buildAssetFilters(params);
  const orderBy = SORTS[params.sort ?? 'no_desc'] ?? SORTS.no_desc;
  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(...orderBy)
    .limit(limit);
  return rows.map((r) => r.id);
}

export async function getAssetById(id: number) {
  // 두 쿼리 모두 id 만 필요하므로 함께 보냅니다. Neon HTTP 드라이버는 쿼리 1건이
  // HTTP 요청 1건이라, 순차로 보내면 왕복 지연이 그대로 두 배가 됩니다.
  const [rows, logs] = await Promise.all([
    db
      .select({
        asset: assets,
        buildingName: buildings.name,
        deptName: departments.name,
        createdByName: users.name,
      })
      .from(assets)
      .leftJoin(buildings, eq(buildings.code, assets.buildingCode))
      .leftJoin(departments, eq(departments.code, assets.deptCode))
      .leftJoin(users, eq(users.id, assets.createdBy))
      .where(eq(assets.id, id))
      .limit(1),
    db
      .select()
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.assetId, id))
      .orderBy(desc(maintenanceLogs.performedOn), desc(maintenanceLogs.id)),
  ]);

  const [row] = rows;
  if (!row) return null;

  return {
    ...row.asset,
    buildingName: row.buildingName,
    deptName: row.deptName,
    logs,
  };
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetById>>>;

/** Exact lookup by asset number, tolerant of scanner formatting. */
export async function findAssetByNo(input: string) {
  const normalized = normalizeAssetNo(input);
  if (!normalized) return null;
  const [row] = await db
    .select({ id: assets.id, assetNo: assets.assetNo, name: assets.name })
    .from(assets)
    .where(eq(assets.assetNo, normalized))
    .limit(1);
  return row ?? null;
}

/**
 * Fallback for the scan page: when input is not a complete asset number, look
 * for partial number matches plus name/serial hits so the user still lands
 * somewhere useful.
 */
export async function searchAssetsLoose(input: string, limit = 20) {
  const term = input.trim();
  if (term.length < 2) return [];
  const fragment = assetNoFragment(term);
  const like = `%${term}%`;
  const conditions: SQL[] = [
    ilike(assets.name, like),
    ilike(assets.serialNo, like),
    ilike(assets.location, like),
    ilike(assets.modelName, like),
  ];
  if (fragment) {
    conditions.push(sql`replace(${assets.assetNo}, '-', '') like ${`%${fragment}%`}`);
  }
  return db
    .select({
      id: assets.id,
      assetNo: assets.assetNo,
      name: assets.name,
      location: assets.location,
      status: assets.status,
      teamName: assets.teamName,
    })
    .from(assets)
    .where(or(...conditions))
    .orderBy(desc(assets.yearCode), desc(assets.seq))
    .limit(limit);
}

export async function getAssetsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: assets.id,
      assetNo: assets.assetNo,
      name: assets.name,
      teamName: assets.teamName,
      location: assets.location,
      acquiredDate: assets.acquiredDate,
      modelName: assets.modelName,
      serialNo: assets.serialNo,
      buildingName: buildings.name,
      deptName: departments.name,
    })
    .from(assets)
    .leftJoin(buildings, eq(buildings.code, assets.buildingCode))
    .leftJoin(departments, eq(departments.code, assets.deptCode))
    .where(inArray(assets.id, ids));

  // Preserve the caller's id order — label sheets should print in the order
  // the user selected, not in whatever order Postgres returns.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => r !== undefined);
}

/**
 * Next free sequence number for a `YY-BBDD` prefix. Returns `null` when every
 * slot up to SEQ_MAX is taken.
 */
export async function getNextSeq(
  yearCode: string,
  buildingCode: string,
  deptCode: string,
): Promise<number | null> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${assets.seq}::int)` })
    .from(assets)
    .where(
      and(
        eq(assets.yearCode, yearCode),
        eq(assets.buildingCode, buildingCode),
        eq(assets.deptCode, deptCode),
      ),
    );
  const next = (row?.max ?? 0) + 1;
  return next > SEQ_MAX ? null : next;
}

export async function getDashboardStats() {
  const thisYearCode = toYearCode(currentYear());

  const [byStatus, totals, byBuilding, recent, upcomingWarranty, recentLogs] = await Promise.all([
    db
      .select({ status: assets.status, count: sql<number>`count(*)::int` })
      .from(assets)
      .groupBy(assets.status),
    db
      .select({
        count: sql<number>`count(*)::int`,
        value: sql<string>`coalesce(sum(${assets.acquiredPrice}), 0)::text`,
        thisYear: sql<number>`count(*) filter (where ${assets.yearCode} = ${thisYearCode})::int`,
      })
      .from(assets),
    db
      .select({
        code: assets.buildingCode,
        name: buildings.name,
        count: sql<number>`count(*)::int`,
      })
      .from(assets)
      .leftJoin(buildings, eq(buildings.code, assets.buildingCode))
      .where(sql`${assets.status} <> 'disposed'`)
      .groupBy(assets.buildingCode, buildings.name)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        id: assets.id,
        assetNo: assets.assetNo,
        name: assets.name,
        location: assets.location,
        status: assets.status,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .orderBy(desc(assets.createdAt))
      .limit(6),
    db
      .select({
        id: assets.id,
        assetNo: assets.assetNo,
        name: assets.name,
        warrantyUntil: assets.warrantyUntil,
      })
      .from(assets)
      .where(and(isNotNull(assets.warrantyUntil), gte(assets.warrantyUntil, sql`current_date`)))
      .orderBy(asc(assets.warrantyUntil))
      .limit(5),
    db
      .select({
        id: maintenanceLogs.id,
        assetId: maintenanceLogs.assetId,
        assetNo: assets.assetNo,
        assetName: assets.name,
        kind: maintenanceLogs.kind,
        performedOn: maintenanceLogs.performedOn,
        description: maintenanceLogs.description,
      })
      .from(maintenanceLogs)
      .innerJoin(assets, eq(assets.id, maintenanceLogs.assetId))
      .orderBy(desc(maintenanceLogs.performedOn), desc(maintenanceLogs.id))
      .limit(6),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, r.count])) as Record<
    AssetStatus,
    number | undefined
  >;

  return {
    total: totals[0]?.count ?? 0,
    totalValue: totals[0]?.value ?? '0',
    thisYear: totals[0]?.thisYear ?? 0,
    statusCounts,
    byBuilding,
    recent,
    upcomingWarranty,
    recentLogs,
  };
}

/** Distinct 취득연도 codes present in the data, for the list filter. */
export async function getYearCodes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ yearCode: assets.yearCode })
    .from(assets)
    .orderBy(desc(assets.yearCode));
  return rows.map((r) => r.yearCode);
}

/** 설정 화면용 — 각 코드를 사용하는 자산 수를 함께 셉니다. */
export async function getLookupsWithUsage() {
  const [buildingRows, deptRows, buildingUsage, deptUsage] = await Promise.all([
    db.select().from(buildings).orderBy(asc(buildings.sortOrder), asc(buildings.code)),
    db.select().from(departments).orderBy(asc(departments.sortOrder), asc(departments.code)),
    db
      .select({ code: assets.buildingCode, count: sql<number>`count(*)::int` })
      .from(assets)
      .groupBy(assets.buildingCode),
    db
      .select({ code: assets.deptCode, count: sql<number>`count(*)::int` })
      .from(assets)
      .groupBy(assets.deptCode),
  ]);

  const buildingCounts = new Map(buildingUsage.map((r) => [r.code, r.count]));
  const deptCounts = new Map(deptUsage.map((r) => [r.code, r.count]));

  return {
    buildings: buildingRows.map((row) => ({
      ...row,
      usageCount: buildingCounts.get(row.code) ?? 0,
    })),
    departments: deptRows.map((row) => ({
      ...row,
      usageCount: deptCounts.get(row.code) ?? 0,
    })),
  };
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.id));
}

/** CSV 내보내기 — 필터를 그대로 적용해 대장 전체 열을 내려 줍니다. */
export async function listAssetsForExport(params: AssetListParams, limit = 10000) {
  const filters = buildAssetFilters(params);
  const orderBy = SORTS[params.sort ?? 'no_asc'] ?? SORTS.no_asc;

  return db
    .select({
      assetNo: assets.assetNo,
      name: assets.name,
      teamName: assets.teamName,
      deptName: departments.name,
      buildingName: buildings.name,
      location: assets.location,
      acquiredDate: assets.acquiredDate,
      acquiredPrice: assets.acquiredPrice,
      manufacturer: assets.manufacturer,
      modelName: assets.modelName,
      serialNo: assets.serialNo,
      spec: assets.spec,
      vendor: assets.vendor,
      quantity: assets.quantity,
      status: assets.status,
      donor: assets.donor,
      warrantyUntil: assets.warrantyUntil,
      notes: assets.notes,
      disposedDate: assets.disposedDate,
      disposalReason: assets.disposalReason,
      disposalNote: assets.disposalNote,
      // 수리·점검 이력은 "2026-07-22 수리: 내용 ($145.00)" 형태로 한 칸에 합칩니다.
      maintenance: sql<string | null>`(
        select string_agg(
          to_char(${maintenanceLogs.performedOn}, 'YYYY-MM-DD')
            || ' ' || (case ${maintenanceLogs.kind} when 'repair' then '수리' else '점검' end)
            || ': ' || ${maintenanceLogs.description}
            || coalesce(' ($' || to_char(${maintenanceLogs.cost}, 'FM999,999,990.00') || ')', ''),
          ' | ' order by ${maintenanceLogs.performedOn}
        )
        from ${maintenanceLogs}
        where ${maintenanceLogs.assetId} = ${assets.id}
      )`,
    })
    .from(assets)
    .leftJoin(buildings, eq(buildings.code, assets.buildingCode))
    .leftJoin(departments, eq(departments.code, assets.deptCode))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(...orderBy)
    .limit(limit);
}
