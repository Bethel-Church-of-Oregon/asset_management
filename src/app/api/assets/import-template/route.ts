import ExcelJS from 'exceljs';
import { getSession } from '@/lib/auth';
import { canAdmin } from '@/lib/session';
import { getLookups } from '@/lib/queries';
import { IMPORT_COLUMNS, REQUIRED_COLUMNS } from '@/lib/asset-import';
import { STATUS_OPTIONS } from '@/lib/constants';
import { today } from '@/lib/format';

/**
 * 일괄 등록 템플릿.
 *
 * 열 이름이 조금이라도 다르면 들여오기가 막히므로, 사람이 직접 만들게 두지 않고
 * 여기서 내려 줍니다. 두 번째 시트에 **그 교회에서 실제로 쓸 수 있는** 건물·사역원
 * 이름을 함께 넣습니다 — 안내 문구로는 오타를 못 막습니다.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });
  if (!canAdmin(session.role)) return new Response('Forbidden', { status: 403 });

  const lookups = await getLookups();
  const headers = Object.values(IMPORT_COLUMNS);
  const required = new Set<string>(REQUIRED_COLUMNS);

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const sheet = wb.addWorksheet('자산');
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell, col) => {
    const isRequired = required.has(headers[col - 1]);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      // 필수 열을 색으로 구분합니다 — 안내를 안 읽어도 눈에 들어옵니다.
      fgColor: { argb: isRequired ? 'FFDCE6FF' : 'FFF1F5F9' },
    };
    cell.alignment = { vertical: 'middle' };
  });
  headerRow.height = 22;
  sheet.columns = headers.map((h) => ({ width: Math.max(12, h.length * 2 + 4) }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const building = lookups.buildings[0]?.name ?? '비전성전';
  const dept = lookups.departments[0]?.name ?? '교육부';
  const example: Record<string, string> = {
    [IMPORT_COLUMNS.name]: '유아부실 TV (왼쪽)',
    [IMPORT_COLUMNS.deptName]: dept,
    [IMPORT_COLUMNS.buildingName]: building,
    [IMPORT_COLUMNS.location]: '비전성전 유아부실',
    [IMPORT_COLUMNS.acquiredDate]: today(),
    [IMPORT_COLUMNS.acquiredPrice]: '649.99',
    [IMPORT_COLUMNS.manufacturer]: 'LG',
    [IMPORT_COLUMNS.quantity]: '1',
    [IMPORT_COLUMNS.status]: '사용중',
  };
  sheet.addRow(headers.map((h) => example[h] ?? ''));
  sheet.getRow(2).font = { color: { argb: 'FF94A3B8' }, italic: true };

  const guide = wb.addWorksheet('입력값 안내');
  guide.columns = [{ width: 18 }, { width: 44 }];
  const lines: [string, string][] = [
    ['자산번호', '적지 마세요 — 등록할 때 앱이 자동으로 매깁니다.'],
    ['필수 열', REQUIRED_COLUMNS.join(' · ')],
    ['취득연도', '취득일자의 연도를 씁니다. 비우면 올해로 들어갑니다.'],
    ['날짜 형식', 'YYYY-MM-DD (엑셀 날짜 서식도 됩니다)'],
    ['취득가액', '숫자만. $ 와 쉼표가 있어도 됩니다. 예) 649.99'],
    ['수량', '비우면 1'],
    [
      '상태',
      STATUS_OPTIONS.filter((o) => o.value !== 'disposed')
        .map((o) => o.label)
        .join(' · ') + ' (폐기는 일괄 등록 불가)',
    ],
    ['', ''],
    ['쓸 수 있는 건물명', ''],
    ...lookups.buildings.map((b): [string, string] => [b.code, b.name]),
    ['', ''],
    ['쓸 수 있는 사역원', ''],
    ...lookups.departments.map((d): [string, string] => [d.code, d.name]),
  ];
  for (const [a, b] of lines) guide.addRow([a, b]);
  guide.getColumn(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `자산_일괄등록_양식_${today()}.xlsx`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="asset-import-template.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
