'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import {
  commitImportAction,
  previewImportAction,
  undoImportAction,
  type ImportState,
} from '@/actions/import';
import { IMPORT_MAX_ROWS, REQUIRED_COLUMNS } from '@/lib/asset-import';
import { IconDownload, IconPrinter, IconTrash, IconWarning } from './icons';
import ConfirmSubmit from './ConfirmSubmit';

export type ImportBatchRow = {
  id: number;
  fileName: string;
  rowCount: number;
  createdAt: Date;
  userName: string | null;
  remaining: number;
  touched: number;
};

const IDLE: ImportState = { phase: 'idle' };

/** 미리보기 표에 한 번에 보여 줄 줄 수 — 더 있으면 "그 외 n건" 으로 접습니다. */
const PREVIEW_LIMIT = 12;

export default function AssetImport({ batches }: { batches: ImportBatchRow[] }) {
  // 파일을 state 로 들고 있는 이유: 미리보기와 등록이 **같은 파일**을 각각 서버에서
  // 다시 읽습니다. 화면이 보낸 줄을 저장하면 클라이언트가 고친 값이 그대로 들어갑니다.
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, previewAction, previewing] = useActionState(previewImportAction, IDLE);
  const [commit, commitAction, committing] = useActionState(commitImportAction, IDLE);

  // 등록이 끝났으면 그 결과가, 아니면 미리보기가 현재 상태입니다.
  const state: ImportState = commit.phase === 'idle' ? preview : commit;
  const plan = state.phase === 'preview' ? state.plan : null;
  const blocked =
    !plan || plan.fatal.length > 0 || plan.errors.length > 0 || plan.rows.length === 0;

  function pick(next: File | null) {
    setFile(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/assets/import-template" className="btn-secondary">
          <IconDownload />
          엑셀 양식 받기
        </a>
        <p className="text-xs text-slate-500">
          양식의 열 이름을 그대로 두고 아래에 자산을 적으세요. 자산번호는 등록할 때 앱이 매깁니다.
        </p>
      </div>

      <form action={previewAction} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="field-label">엑셀 파일 (.xlsx)</span>
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".xlsx"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="field-input !py-1.5 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-slate-700"
          />
        </label>
        <button type="submit" className="btn-secondary" disabled={!file || previewing}>
          {previewing ? '읽는 중...' : '미리보기'}
        </button>
      </form>

      {state.phase === 'error' ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </p>
      ) : null}

      {plan ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              {state.phase === 'preview' ? state.fileName : ''}
            </span>
            <span className="text-sm text-slate-600">
              등록 가능 <strong className="text-slate-900">{plan.rows.length}건</strong>
              {plan.errors.length > 0 ? (
                <>
                  {' · '}
                  <strong className="text-red-600">오류 {plan.errors.length}건</strong>
                </>
              ) : null}
            </span>
            <form action={commitAction} className="ml-auto">
              {/* 같은 파일을 다시 보냅니다 — 서버가 처음부터 읽어 번호를 새로 매깁니다. */}
              <input
                type="file"
                name="file"
                hidden
                ref={(el) => {
                  if (el && file) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    el.files = dt.files;
                  }
                }}
              />
              <button type="submit" className="btn-primary" disabled={blocked || committing}>
                {committing ? '등록 중...' : `${plan.rows.length}건 등록`}
              </button>
            </form>
          </div>

          {plan.fatal.length > 0 ? (
            <ul className="space-y-1 px-4 py-3 text-sm text-red-700">
              {plan.fatal.map((message) => (
                <li key={message}>· {message}</li>
              ))}
            </ul>
          ) : null}

          {plan.errors.length > 0 ? (
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="mb-1.5 text-xs font-bold text-red-700">
                아래를 고쳐서 다시 올려 주세요 — 오류가 있으면 한 건도 등록되지 않습니다
              </p>
              <ul className="space-y-0.5 text-xs text-red-800">
                {plan.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    <span className="mono font-semibold">{e.rowNo}행</span> · {e.column} —{' '}
                    {e.message}
                  </li>
                ))}
              </ul>
              {plan.errors.length > 20 ? (
                <p className="mt-1 text-xs text-red-700">그 외 {plan.errors.length - 20}건</p>
              ) : null}
            </div>
          ) : null}

          {plan.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">행</th>
                    <th className="px-4 py-2 font-medium">자산번호 (예정)</th>
                    <th className="px-4 py-2 font-medium">자산명</th>
                    <th className="px-4 py-2 font-medium">건물</th>
                    <th className="px-4 py-2 font-medium">부서</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.slice(0, PREVIEW_LIMIT).map((r) => (
                    <tr key={r.rowNo} className="border-b border-slate-50">
                      <td className="mono px-4 py-1.5 text-xs text-slate-400">{r.rowNo}</td>
                      <td className="mono px-4 py-1.5 font-semibold text-brand-700">{r.assetNo}</td>
                      <td className="px-4 py-1.5 text-slate-800">{r.name}</td>
                      <td className="px-4 py-1.5 text-slate-600">{r.buildingName}</td>
                      <td className="px-4 py-1.5 text-slate-600">{r.deptName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {plan.rows.length > PREVIEW_LIMIT ? (
                <p className="px-4 py-2 text-xs text-slate-500">
                  그 외 {plan.rows.length - PREVIEW_LIMIT}건은 등록 후 자산목록에서 확인하세요.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'done' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">{state.count}건을 등록했습니다.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/labels?ids=${state.assetIds.join(',')}`}
              className="btn-secondary !py-1.5"
            >
              <IconPrinter />
              이번 등록분 라벨 출력
            </Link>
            <Link href="/assets?sort=recent" className="btn-secondary !py-1.5">
              자산목록에서 보기
            </Link>
          </div>
        </div>
      ) : null}

      {batches.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900">
            최근 일괄 등록
          </p>
          <ul className="divide-y divide-slate-50">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-800">{b.fileName}</span>
                <span className="text-xs text-slate-500">
                  {b.rowCount}건 등록 · 남아 있음 {b.remaining}건
                  {b.userName ? ` · ${b.userName}` : ''} ·{' '}
                  {new Date(b.createdAt).toLocaleString('ko-KR')}
                </span>
                {b.touched > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    <IconWarning />
                    {b.touched}건은 등록 후 수정됨
                  </span>
                ) : null}
                <form action={undoImportAction} className="ml-auto">
                  <input type="hidden" name="batchId" value={b.id} />
                  <ConfirmSubmit
                    className="btn-danger !py-1 text-xs"
                    message={
                      b.touched > 0
                        ? `이 묶음의 자산 ${b.remaining}건을 지웁니다. 그 중 ${b.touched}건은 등록 후 수정됐고, 딸린 수리·점검 이력도 함께 사라집니다. 되돌릴 수 없습니다. 계속할까요?`
                        : `이 묶음의 자산 ${b.remaining}건을 지웁니다. 되돌릴 수 없습니다. 계속할까요?`
                    }
                  >
                    <IconTrash />
                    등록 취소
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-slate-500">
        한 번에 최대 {IMPORT_MAX_ROWS}건. 필수 열은 {REQUIRED_COLUMNS.join(' · ')} 입니다. 오류가
        하나라도 있으면 <strong>한 건도 등록되지 않습니다</strong> — 엑셀을 고쳐 다시 올리세요.
      </p>
    </div>
  );
}
