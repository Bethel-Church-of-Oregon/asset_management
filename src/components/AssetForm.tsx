'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { createAssetAction, suggestSeqAction, updateAssetAction } from '@/actions/assets';
import { IDLE } from '@/actions/types';
import type { Asset } from '@/db/schema';
import type { Lookups } from '@/lib/queries';
import { SEQ_DIGITS, SEQ_MAX, assetNoBarcodeValue, toSeq } from '@/lib/asset-no';
import { STATUS_OPTIONS } from '@/lib/constants';
import { today } from '@/lib/format';
import Barcode from './Barcode';
import FormSection, { Field } from './FormSection';
import { FormBanner } from './FormMessage';
import MoneyInput from './MoneyInput';
import SubmitButton from './SubmitButton';

type Defaults = {
  yearCode?: string;
  buildingCode?: string;
  deptCode?: string;
  teamName?: string;
  location?: string;
};

type Props = {
  mode: 'create' | 'edit';
  lookups: Lookups;
  /** 취득연도 선택 목록 (내림차순). 등록 화면에서만 씁니다. */
  yearOptions?: { code: string; label: string }[];
  asset?: Asset;
  defaults?: Defaults;
};

export default function AssetForm({ mode, lookups, yearOptions = [], asset, defaults }: Props) {
  const action = mode === 'create' ? createAssetAction : updateAssetAction;
  const [state, formAction] = useActionState(action, IDLE);

  const [yearCode, setYearCode] = useState(
    asset?.yearCode ?? defaults?.yearCode ?? yearOptions[0]?.code ?? '',
  );
  const [buildingCode, setBuildingCode] = useState(
    asset?.buildingCode ?? defaults?.buildingCode ?? '',
  );
  const [deptCode, setDeptCode] = useState(asset?.deptCode ?? defaults?.deptCode ?? '');
  const [seq, setSeq] = useState(asset?.seq ?? '');
  const [status, setStatus] = useState(asset?.status ?? 'in_use');
  const [teamName, setTeamName] = useState(asset?.teamName ?? defaults?.teamName ?? '');

  const [suggesting, startSuggest] = useTransition();
  const [seqNotice, setSeqNotice] = useState<string | null>(null);
  // In edit mode the number already exists; never auto-overwrite it.
  const autoSeq = mode === 'create';
  const seqTouched = useRef(false);

  useEffect(() => {
    if (!autoSeq || seqTouched.current) return;
    if (!/^\d{2}$/.test(yearCode) || !buildingCode || !deptCode) return;

    let cancelled = false;
    startSuggest(async () => {
      // 소진과 실패를 구분합니다 — 둘을 같은 문구로 보여 주면 한 번도 쓰지 않은
      // 조합에 "모두 사용했습니다" 가 떠서 원인을 찾을 수 없게 됩니다.
      try {
        const result = await suggestSeqAction(yearCode, buildingCode, deptCode);
        if (cancelled) return;
        if (result.seq) {
          setSeq(result.seq);
          setSeqNotice(null);
        } else if (result.exhausted) {
          setSeqNotice(
            `이 조합의 번호(${toSeq(1)}~${SEQ_MAX})를 모두 사용했습니다. 다른 조합을 선택하세요.`,
          );
        } else {
          setSeqNotice('다음 번호를 제안하지 못했습니다. 번호를 직접 입력하세요.');
        }
      } catch {
        if (cancelled) return;
        setSeqNotice('다음 번호를 불러오지 못했습니다. 번호를 직접 입력하세요.');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearCode, buildingCode, deptCode, autoSeq]);

  const assetNoPreview =
    /^\d{2}$/.test(yearCode) &&
    buildingCode &&
    deptCode &&
    new RegExp(`^\\d{1,${SEQ_DIGITS}}$`).test(seq)
      ? `${yearCode}-${buildingCode}${deptCode}-${seq.padStart(SEQ_DIGITS, '0')}`
      : null;

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      {state.error ? <FormBanner state={state} /> : null}

      {/* 자산번호는 등록할 때만 정합니다. 한 번 부여한 번호는 바꾸지 않습니다 —
          라벨을 이미 붙였고, 번호가 바뀌면 물건과 기록이 어긋납니다.
          서버(updateAssetAction)도 수정 요청의 번호 값을 무시합니다. */}
      {mode === 'create' ? (
        <>
          {/* ── 자산번호 ─────────────────────────────────────────────────────── */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <h2 className="text-sm font-bold text-slate-900">자산번호</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                연도 2자리 + 건물 2자리 + 부서 2자리 + 고유번호 4자리
              </p>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="취득연도" htmlFor="yearCode" required error={errors.yearCode}>
                  <select
                    id="yearCode"
                    name="yearCode"
                    className="field-input mono"
                    value={yearCode}
                    onChange={(e) => setYearCode(e.target.value)}
                    required
                  >
                    {yearOptions.map((y) => (
                      <option key={y.code} value={y.code}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="건물 / 위치"
                  htmlFor="buildingCode"
                  required
                  error={errors.buildingCode}
                >
                  <select
                    id="buildingCode"
                    name="buildingCode"
                    className="field-input"
                    value={buildingCode}
                    onChange={(e) => setBuildingCode(e.target.value)}
                    required
                  >
                    <option value="">선택</option>
                    {lookups.buildings.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="관리부서" htmlFor="deptCode" required error={errors.deptCode}>
                  <select
                    id="deptCode"
                    name="deptCode"
                    className="field-input"
                    value={deptCode}
                    onChange={(e) => {
                      setDeptCode(e.target.value);
                      // 팀명을 비워뒀다면 부서 이름으로 채워 줍니다.
                      const next = lookups.departments.find((d) => d.code === e.target.value);
                      if (next && teamName.trim() === '') setTeamName(next.name);
                    }}
                    required
                  >
                    <option value="">선택</option>
                    {lookups.departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} · {d.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="고유번호"
                  htmlFor="seq"
                  required
                  error={errors.seq}
                  hint={
                    seqNotice ??
                    (autoSeq
                      ? suggesting
                        ? '다음 번호 조회 중...'
                        : '자동 제안됩니다. 필요하면 직접 수정하세요.'
                      : '번호를 바꾸면 바코드를 다시 출력해야 합니다.')
                  }
                >
                  <input
                    id="seq"
                    name="seq"
                    type="text"
                    inputMode="numeric"
                    maxLength={SEQ_DIGITS}
                    className="field-input mono text-center tracking-widest"
                    placeholder={toSeq(1)}
                    value={seq}
                    onChange={(e) => {
                      seqTouched.current = true;
                      setSeq(e.target.value.replace(/[^\d]/g, '').slice(0, SEQ_DIGITS));
                    }}
                    onBlur={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, '');
                      if (digits) setSeq(digits.padStart(SEQ_DIGITS, '0'));
                    }}
                    required
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center lg:w-64">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  자산번호
                </div>
                <div className="mono mb-2 text-2xl font-bold tracking-wider text-slate-900">
                  {assetNoPreview ?? '—'}
                </div>
                {assetNoPreview ? (
                  <Barcode
                    value={assetNoBarcodeValue(assetNoPreview)}
                    moduleWidth={1.6}
                    height={44}
                    fontSize={0}
                    showText={false}
                    cssWidth="100%"
                  />
                ) : (
                  <p className="py-3 text-xs text-slate-400">
                    항목을 모두 선택하면 바코드가 표시됩니다.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* ── 기본 정보 ────────────────────────────────────────────────────── */}
      <FormSection title="기본 정보">
        <Field label="자산명" htmlFor="name" required error={errors.name} span>
          <input
            id="name"
            name="name"
            className="field-input"
            defaultValue={asset?.name ?? ''}
            placeholder="예: 유아부실 TV (왼쪽)"
            maxLength={200}
            required
            autoFocus={mode === 'create'}
          />
        </Field>

        {/* hint 를 두지 않습니다 — 입력칸 안내문(placeholder)과 같은 말이 되고,
            선택한 부서는 바로 위 '관리부서' 칸에 이미 보입니다. */}
        <Field label="관리부서 및 팀명" htmlFor="teamName" error={errors.teamName}>
          <input
            id="teamName"
            name="teamName"
            className="field-input"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="예: 예배사역원 미디어팀"
            maxLength={100}
          />
        </Field>

        <Field label="설치 / 보관 장소" htmlFor="location" error={errors.location}>
          <input
            id="location"
            name="location"
            className="field-input"
            defaultValue={asset?.location ?? defaults?.location ?? ''}
            placeholder="예: 비전성전 유아부실"
            maxLength={200}
          />
        </Field>

        <Field label="상태" htmlFor="status" required error={errors.status}>
          <select
            id="status"
            name="status"
            className="field-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="수량"
          htmlFor="quantity"
          error={errors.quantity}
          hint="세트 단위로 관리할 때 사용"
        >
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={99999}
            className="field-input mono"
            defaultValue={asset?.quantity ?? 1}
          />
        </Field>
      </FormSection>

      {/* ── 취득 정보 ────────────────────────────────────────────────────── */}
      <FormSection title="취득 정보">
        <Field label="취득일자" htmlFor="acquiredDate" error={errors.acquiredDate}>
          <input
            id="acquiredDate"
            name="acquiredDate"
            type="date"
            className="field-input"
            defaultValue={asset?.acquiredDate ?? ''}
          />
        </Field>

        <Field label="취득가액 (구입 시 가격)" htmlFor="acquiredPrice" error={errors.acquiredPrice}>
          <MoneyInput id="acquiredPrice" name="acquiredPrice" defaultValue={asset?.acquiredPrice} />
        </Field>

        <Field label="구입처" htmlFor="vendor" error={errors.vendor} hint="예: Best Buy">
          <input
            id="vendor"
            name="vendor"
            className="field-input"
            defaultValue={asset?.vendor ?? ''}
            maxLength={160}
          />
        </Field>
      </FormSection>

      {/* ── 제조사 및 규격 ───────────────────────────────────────────────── */}
      <FormSection title="제조사 및 규격">
        <Field label="제조사" htmlFor="manufacturer" error={errors.manufacturer}>
          <input
            id="manufacturer"
            name="manufacturer"
            className="field-input"
            defaultValue={asset?.manufacturer ?? ''}
            placeholder="예: LG"
            maxLength={120}
          />
        </Field>

        <Field label="모델명" htmlFor="modelName" error={errors.modelName}>
          <input
            id="modelName"
            name="modelName"
            className="field-input mono"
            defaultValue={asset?.modelName ?? ''}
            placeholder="예: 65UQ7570PUJ"
            maxLength={160}
          />
        </Field>

        <Field label="Serial Number" htmlFor="serialNo" error={errors.serialNo}>
          <input
            id="serialNo"
            name="serialNo"
            className="field-input mono"
            defaultValue={asset?.serialNo ?? ''}
            placeholder="예: 303MXNP4K721"
            maxLength={160}
          />
        </Field>

        <Field label="규격 / 사양" htmlFor="spec" error={errors.spec}>
          <input
            id="spec"
            name="spec"
            className="field-input"
            defaultValue={asset?.spec ?? ''}
            placeholder='예: 65" 4K UHD, 벽걸이 설치'
          />
        </Field>
      </FormSection>

      {/* ── 특이사항 ─────────────────────────────────────────────────────── */}
      <FormSection title="특이사항" description="기증자, 워런티 등 기억해 둘 내용">
        <Field label="기증자" htmlFor="donor" error={errors.donor} hint="기증품일 때만 입력">
          <input
            id="donor"
            name="donor"
            className="field-input"
            defaultValue={asset?.donor ?? ''}
            placeholder="예: 김OO 성도"
            maxLength={120}
          />
        </Field>

        <Field label="워런티 만료일" htmlFor="warrantyUntil" error={errors.warrantyUntil}>
          <input
            id="warrantyUntil"
            name="warrantyUntil"
            type="date"
            className="field-input"
            defaultValue={asset?.warrantyUntil ?? ''}
          />
        </Field>

        <Field label="비고" htmlFor="notes" error={errors.notes} span>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="field-input"
            defaultValue={asset?.notes ?? ''}
            placeholder="구입 경위, 부속품, 주의사항 등"
          />
        </Field>
      </FormSection>

      {/* ── 폐기 기록 (상태가 '폐기'일 때만) ─────────────────────────────── */}
      {status === 'disposed' ? (
        <FormSection title="폐기 기록" description="상태를 '폐기'로 선택했을 때 기록됩니다.">
          <Field label="폐기일자" htmlFor="disposedDate" error={errors.disposedDate}>
            <input
              id="disposedDate"
              name="disposedDate"
              type="date"
              className="field-input"
              defaultValue={asset?.disposedDate ?? today()}
            />
          </Field>

          <Field label="폐기 사유" htmlFor="disposalReason" error={errors.disposalReason}>
            <input
              id="disposalReason"
              name="disposalReason"
              className="field-input"
              defaultValue={asset?.disposalReason ?? ''}
              placeholder="예: 노후/파손"
              maxLength={200}
            />
          </Field>

          <Field label="폐기 상세" htmlFor="disposalNote" error={errors.disposalNote} span>
            <textarea
              id="disposalNote"
              name="disposalNote"
              rows={2}
              className="field-input"
              defaultValue={asset?.disposalNote ?? ''}
              placeholder="처리 방법, 수거 업체 등"
            />
          </Field>
        </FormSection>
      ) : (
        <>
          {/* Keep the values around so switching status back and forth in one
              session does not silently drop an existing disposal record. */}
          <input type="hidden" name="disposedDate" value={asset?.disposedDate ?? ''} />
          <input type="hidden" name="disposalReason" value={asset?.disposalReason ?? ''} />
          <input type="hidden" name="disposalNote" value={asset?.disposalNote ?? ''} />
        </>
      )}

      {/* ── 저장 ─────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* 등록 후 곧바로 라벨 출력 화면으로 갑니다 — 버튼 이름이 곧 동작입니다. */}
          <SubmitButton pendingLabel={mode === 'create' ? '등록 중...' : '저장 중...'}>
            {mode === 'create' ? '등록 후 바코드 출력' : '변경사항 저장'}
          </SubmitButton>

          {/* 같은 건물·부서·팀·장소를 유지한 빈 폼으로 돌아가 다음 번호를 채웁니다. */}
          {mode === 'create' ? (
            <SubmitButton
              className="btn-secondary"
              name="_continue"
              value="1"
              pendingLabel="등록 중..."
            >
              저장 후 다음 자산 등록
            </SubmitButton>
          ) : null}

          <Link href={asset ? `/assets/${asset.id}` : '/assets'} className="btn-secondary ml-auto">
            취소
          </Link>
        </div>

        {mode === 'create' ? (
          <p className="mt-2 text-xs text-slate-500">
            &lsquo;저장 후 다음 자산 등록&rsquo; 은 추후에 바코드 출력이 가능합니다.
          </p>
        ) : null}
      </div>
    </form>
  );
}
