import { type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { listAssetsForExport } from '@/lib/queries';
import { STATUS_LABELS } from '@/lib/constants';
import { today } from '@/lib/format';

const COLUMNS: { key: string; header: string }[] = [
  { key: 'assetNo', header: '자산번호' },
  { key: 'name', header: '자산명' },
  { key: 'deptName', header: '관리 사역원' },
  { key: 'teamName', header: '관리 팀명' },
  { key: 'buildingName', header: '건물/위치' },
  { key: 'location', header: '설치/보관 장소' },
  { key: 'acquiredDate', header: '취득일자' },
  { key: 'acquiredPrice', header: '취득가액' },
  { key: 'manufacturer', header: '제조사' },
  { key: 'modelName', header: '모델명' },
  { key: 'serialNo', header: 'Serial Number' },
  { key: 'spec', header: '규격' },
  { key: 'vendor', header: '구입처' },
  { key: 'quantity', header: '수량' },
  { key: 'status', header: '상태' },
  { key: 'maintenance', header: '수리/점검 이력' },
  { key: 'disposedDate', header: '폐기일자' },
  { key: 'disposalReason', header: '폐기 사유' },
  { key: 'disposalNote', header: '폐기 상세' },
  { key: 'donor', header: '기증자' },
  { key: 'warrantyUntil', header: '워런티 만료일' },
  { key: 'notes', header: '특이사항' },
];

/** RFC 4180 escaping — 쉼표·따옴표·줄바꿈이 들어간 값도 안전하게 감쌉니다. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const params = request.nextUrl.searchParams;
  const rows = await listAssetsForExport({
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    building: params.get('building') ?? undefined,
    dept: params.get('dept') ?? undefined,
    year: params.get('year') ?? undefined,
    sort: params.get('sort') ?? undefined,
  });

  const lines = [COLUMNS.map((column) => csvCell(column.header)).join(',')];
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    lines.push(
      COLUMNS.map((column) => {
        const value = record[column.key];
        if (column.key === 'status' && typeof value === 'string') {
          return csvCell(STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? value);
        }
        return csvCell(value);
      }).join(','),
    );
  }

  // Excel(한글 Windows)에서 UTF-8 을 제대로 읽도록 BOM 을 붙입니다.
  const body = `﻿${lines.join('\r\n')}\r\n`;
  const filename = `자산대장_${today()}.csv`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="assets-${today()}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
