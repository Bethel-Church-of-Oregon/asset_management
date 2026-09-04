'use client';

import { useActionState, useEffect, useRef } from 'react';
import {
  deleteBuildingAction,
  deleteDepartmentAction,
  saveBuildingAction,
  saveDepartmentAction,
} from '@/actions/settings';
import { IDLE } from '@/actions/types';
import { CODE_DIGITS } from '@/lib/asset-no';
import ConfirmSubmit from './ConfirmSubmit';
import SubmitButton from './SubmitButton';
import { FormBanner, FormError } from './FormMessage';
import { IconPlus, IconTrash } from './icons';

export type LookupRowData = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** 이 코드를 쓰는 자산 수 — 삭제 가능 여부를 미리 알려 줍니다. */
  usageCount: number;
};

type Props = {
  kind: 'building' | 'department';
  title: string;
  description: string;
  rows: LookupRowData[];
};

export default function LookupManager({ kind, title, description, rows }: Props) {
  const save = kind === 'building' ? saveBuildingAction : saveDepartmentAction;
  const remove = kind === 'building' ? deleteBuildingAction : deleteDepartmentAction;

  return (
    <section className="card p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>

      <div className="space-y-2">
        <div className="hidden gap-2 px-1 text-xs font-semibold text-slate-500 sm:grid sm:grid-cols-[3.5rem_1fr_4.5rem_5rem_auto]">
          <span>코드</span>
          <span>이름</span>
          <span>정렬</span>
          <span>사용</span>
          <span />
        </div>

        {rows.map((row) => (
          <LookupRow key={row.id} row={row} save={save} remove={remove} />
        ))}

        {rows.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">등록된 항목이 없습니다.</p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-xs font-bold text-slate-700">새 항목 추가</h3>
        <AddLookupRow save={save} />
      </div>
    </section>
  );
}

type ActionFn = typeof saveBuildingAction;

function LookupRow({
  row,
  save,
  remove,
}: {
  row: LookupRowData;
  save: ActionFn;
  remove: ActionFn;
}) {
  const [saveState, saveAction] = useActionState(save, IDLE);
  const [removeState, removeAction] = useActionState(remove, IDLE);

  return (
    <div
      className={`rounded-lg border p-2 ${row.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50'}`}
    >
      <div className="grid gap-2 sm:grid-cols-[3.5rem_1fr_4.5rem_5rem_auto] sm:items-center">
        <form action={saveAction} className="contents">
          <input type="hidden" name="id" value={row.id} />
          <input
            name="code"
            defaultValue={row.code}
            maxLength={CODE_DIGITS}
            inputMode="numeric"
            className="field-input mono !py-1.5 text-center"
            aria-label="코드"
            required
          />
          <input
            name="name"
            defaultValue={row.name}
            maxLength={100}
            className="field-input !py-1.5"
            aria-label="이름"
            required
          />
          <input
            name="sortOrder"
            type="number"
            defaultValue={row.sortOrder}
            min={0}
            max={999}
            className="field-input mono !py-1.5 text-center"
            aria-label="정렬 순서"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={row.isActive}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            사용
          </label>
          <SubmitButton className="btn-secondary !py-1.5 text-xs" pendingLabel="저장 중">
            저장
          </SubmitButton>
        </form>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
        <span className="mono text-xs text-slate-400">자산 {row.usageCount}건 사용</span>
        <form action={removeAction} className="ml-auto">
          <input type="hidden" name="id" value={row.id} />
          <ConfirmSubmit
            className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            title={row.usageCount > 0 ? '사용 중이므로 사용 안함으로 변경됩니다' : '삭제'}
            message={
              row.usageCount > 0
                ? `자산 ${row.usageCount}건이 '${row.code} · ${row.name}' 을 사용하고 있어 삭제하지 않고 '사용 안함'으로 바꿉니다. 계속할까요?`
                : `'${row.code} · ${row.name}' 을 삭제할까요?`
            }
            pendingLabel="…"
          >
            <IconTrash />
          </ConfirmSubmit>
        </form>
      </div>

      {saveState.error || saveState.fieldErrors || removeState.error ? (
        <div className="mt-1.5 space-y-1 px-1">
          <FormError>{saveState.fieldErrors?.code}</FormError>
          <FormError>{saveState.fieldErrors?.name}</FormError>
          <FormError>{saveState.error}</FormError>
          <FormError>{removeState.error}</FormError>
        </div>
      ) : null}

      {removeState.ok && removeState.message ? (
        <p className="mt-1.5 px-1 text-xs font-medium text-emerald-700">{removeState.message}</p>
      ) : null}
    </div>
  );
}

function AddLookupRow({ save }: { save: ActionFn }) {
  const [state, action] = useActionState(save, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[3.5rem_1fr_4.5rem_auto] sm:items-start">
        <div>
          <input
            name="code"
            maxLength={CODE_DIGITS}
            inputMode="numeric"
            placeholder="06"
            className="field-input mono !py-1.5 text-center"
            aria-label="코드"
            required
          />
          <FormError>{state.fieldErrors?.code}</FormError>
        </div>
        <div>
          <input
            name="name"
            maxLength={100}
            placeholder="이름"
            className="field-input !py-1.5"
            aria-label="이름"
            required
          />
          <FormError>{state.fieldErrors?.name}</FormError>
        </div>
        <input
          name="sortOrder"
          type="number"
          placeholder="0"
          min={0}
          max={999}
          className="field-input mono !py-1.5 text-center"
          aria-label="정렬 순서"
        />
        <SubmitButton className="btn-primary !py-1.5 text-xs" pendingLabel="추가 중">
          <IconPlus />
          추가
        </SubmitButton>
      </div>
      <FormBanner state={state} />
    </form>
  );
}
