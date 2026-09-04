'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addMaintenanceAction } from '@/actions/assets';
import { IDLE } from '@/actions/types';
import { FormBanner, FormError } from './FormMessage';
import MoneyInput from './MoneyInput';
import SubmitButton from './SubmitButton';
import { today } from '@/lib/format';

export default function MaintenanceForm({ assetId }: { assetId: number }) {
  const [state, action] = useActionState(addMaintenanceAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  // 저장에 성공하면 다음 이력을 바로 입력할 수 있게 폼을 비웁니다.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="assetId" value={assetId} />
      <FormBanner state={state} />

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="field-label" htmlFor="kind">
            구분
          </label>
          <select id="kind" name="kind" className="field-input" defaultValue="repair">
            <option value="repair">수리</option>
            <option value="inspection">점검</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="performedOn">
            날짜
          </label>
          <input
            id="performedOn"
            name="performedOn"
            type="date"
            className="field-input"
            defaultValue={today()}
            required
          />
          <FormError>{errors.performedOn}</FormError>
        </div>

        <div>
          <label className="field-label" htmlFor="cost">
            비용
          </label>
          <MoneyInput id="cost" name="cost" />
          <FormError>{errors.cost}</FormError>
        </div>

        <div>
          <label className="field-label" htmlFor="vendor">
            업체
          </label>
          <input
            id="vendor"
            name="vendor"
            className="field-input"
            placeholder="예: 사운드코리아 A/S"
            maxLength={160}
          />
        </div>

        <div className="sm:col-span-3">
          <label className="field-label" htmlFor="description">
            내용
          </label>
          <input
            id="description"
            name="description"
            className="field-input"
            placeholder="예: 2번 채널 리시버 잡음 — 안테나 커넥터 교체"
            required
            maxLength={2000}
          />
          <FormError>{errors.description}</FormError>
        </div>

        <div>
          <label className="field-label" htmlFor="performedBy">
            담당자
          </label>
          <input
            id="performedBy"
            name="performedBy"
            className="field-input"
            placeholder="예: 음향팀 이OO"
            maxLength={120}
          />
        </div>
      </div>

      <SubmitButton className="btn-primary !py-1.5 text-xs" pendingLabel="저장 중...">
        이력 추가
      </SubmitButton>
    </form>
  );
}
