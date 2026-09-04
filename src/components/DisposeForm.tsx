'use client';

import { useActionState, useState } from 'react';
import { disposeAssetAction } from '@/actions/assets';
import { IDLE } from '@/actions/types';
import { FormBanner, FormError } from './FormMessage';
import SubmitButton from './SubmitButton';
import { IconTrash } from './icons';
import { todayInSeoul } from '@/lib/format';

export default function DisposeForm({ assetId }: { assetId: number }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(disposeAssetAction, IDLE);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">
        <IconTrash />
        폐기 처리
      </button>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="w-full space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
      <input type="hidden" name="id" value={assetId} />
      <h3 className="text-sm font-bold text-red-900">폐기 처리</h3>
      <p className="text-xs text-red-800">
        폐기하면 상태가 &lsquo;폐기&rsquo;로 바뀌고 기록이 남습니다. 자산 정보와 수리 이력은
        그대로 보존됩니다.
      </p>

      <FormBanner state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="disposedDate">
            폐기일자
          </label>
          <input
            id="disposedDate"
            name="disposedDate"
            type="date"
            className="field-input"
            defaultValue={todayInSeoul()}
            required
          />
          <FormError>{errors.disposedDate}</FormError>
        </div>

        <div>
          <label className="field-label" htmlFor="disposalReason">
            폐기 사유
          </label>
          <input
            id="disposalReason"
            name="disposalReason"
            className="field-input"
            placeholder="예: 노후/파손"
            required
            maxLength={200}
          />
          <FormError>{errors.disposalReason}</FormError>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="disposalNote">
            상세 (선택)
          </label>
          <textarea
            id="disposalNote"
            name="disposalNote"
            rows={2}
            className="field-input"
            placeholder="처리 방법, 수거 업체 등"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton className="btn-danger" pendingLabel="처리 중...">
          폐기 확정
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          취소
        </button>
      </div>
    </form>
  );
}
