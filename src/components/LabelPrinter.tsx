'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Barcode from './Barcode';
import { IconBack, IconPrinter } from './icons';
import {
  BARCODE_QUIET_ZONE_MODULES,
  DEFAULT_CONTENT,
  DEFAULT_PRESET_ID,
  FONT_BASE_PT,
  LABEL_PRESETS,
  type LabelContent,
  type LabelLayout,
  buildPrintCss,
  findPreset,
  measureContentFit,
  presetContentDefaults,
  presetToLayout,
  sheetCapacity,
} from '@/lib/labels';
import { formatDate } from '@/lib/format';

export type LabelAsset = {
  id: number;
  assetNo: string;
  name: string;
  teamName: string | null;
  location: string | null;
  acquiredDate: string | null;
  buildingName: string | null;
  deptName: string | null;
};

const STORAGE_KEY = 'cam.labelSettings.v1';

type Settings = {
  presetId: string;
  layout: LabelLayout;
  content: LabelContent;
  skipCells: number;
};

function defaultSettings(): Settings {
  const preset = findPreset(DEFAULT_PRESET_ID);
  return {
    presetId: preset.id,
    layout: presetToLayout(preset),
    content: { ...DEFAULT_CONTENT, ...presetContentDefaults(preset) },
    skipCells: 0,
  };
}

export default function LabelPrinter({ assets }: { assets: LabelAsset[] }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [restored, setRestored] = useState(false);

  // 마지막 라벨 설정을 브라우저에 기억해 둡니다 (프린터가 바뀌지 않는 한 재설정 불필요).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings((current) => ({
          presetId: parsed.presetId ?? current.presetId,
          layout: { ...current.layout, ...parsed.layout },
          content: { ...current.content, ...parsed.content },
          skipCells: parsed.skipCells ?? 0,
        }));
      }
    } catch {
      // 저장된 값이 깨졌거나 저장소를 못 쓰는 환경 — 기본값으로 진행합니다.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // 저장 실패는 무시 — 출력에는 영향이 없습니다.
    }
  }, [settings, restored]);

  const { layout, content } = settings;

  const cells = useMemo(() => {
    const copies = Math.min(20, Math.max(1, content.copies));
    const list: (LabelAsset | null)[] = [];
    if (layout.kind === 'sheet') {
      for (let i = 0; i < Math.max(0, Math.min(settings.skipCells, sheetCapacity(layout) - 1)); i++) {
        list.push(null);
      }
    }
    for (const asset of assets) {
      for (let i = 0; i < copies; i++) list.push(asset);
    }
    return list;
  }, [assets, content.copies, layout, settings.skipCells]);

  const printCss = useMemo(() => buildPrintCss(layout), [layout]);

  function applyPreset(presetId: string) {
    const preset = findPreset(presetId);
    // 치수를 바꾸면 바코드 높이·글자 크기도 그 규격의 권장값으로 맞춥니다.
    // 표시 항목 토글(자산명·장소 등)은 사용자가 정한 대로 둡니다.
    setSettings((s) => ({
      ...s,
      presetId,
      layout: presetToLayout(preset),
      content: { ...s.content, ...presetContentDefaults(preset) },
    }));
  }

  function setLayout<K extends keyof LabelLayout>(key: K, value: LabelLayout[K]) {
    setSettings((s) => ({ ...s, presetId: 'custom', layout: { ...s.layout, [key]: value } }));
  }

  function setContent<K extends keyof LabelContent>(key: K, value: LabelContent[K]) {
    setSettings((s) => ({ ...s, content: { ...s.content, [key]: value } }));
  }

  const activePreset = LABEL_PRESETS.find((p) => p.id === settings.presetId);
  const totalLabels = cells.filter(Boolean).length;

  // 선택한 자산 중 하나라도 부가정보(장소·팀명·취득일)가 채워지면 그 줄이 생깁니다.
  const hasMetaLine =
    (content.showLocation && assets.some((a) => a.location)) ||
    (content.showTeam && assets.some((a) => a.teamName ?? a.deptName)) ||
    (content.showAcquiredDate && assets.some((a) => a.acquiredDate));
  const fit = measureContentFit(layout, content, hasMetaLine);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/assets" className="btn-secondary">
            <IconBack />
            목록으로
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">
              자산 {assets.length}건 · 라벨 {totalLabels}장 ·{' '}
              <span className={fit.fits ? 'text-slate-500' : 'font-semibold text-red-600'}>
                세로 {fit.neededMm.toFixed(1)}/{fit.availableMm.toFixed(1)}mm
              </span>
            </span>
            <button type="button" onClick={() => window.print()} className="btn-primary">
              <IconPrinter />
              인쇄
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">라벨 설정</h2>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="field-label" htmlFor="preset">
                규격
              </label>
              <select
                id="preset"
                className="field-input"
                value={settings.presetId}
                onChange={(e) => {
                  if (e.target.value !== 'custom') applyPreset(e.target.value);
                }}
              >
                {LABEL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
                <option value="custom">직접 지정</option>
              </select>
              <p className="field-hint">{activePreset?.note ?? '아래 값을 직접 조정한 상태입니다.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-5">
              <NumField
                label="가로 (mm)"
                value={layout.widthMm}
                step={0.1}
                min={20}
                max={210}
                onChange={(v) => setLayout('widthMm', v)}
              />
              <NumField
                label="세로 (mm)"
                value={layout.heightMm}
                step={0.1}
                min={10}
                max={297}
                onChange={(v) => setLayout('heightMm', v)}
              />
              <NumField
                label="내부 여백 (mm)"
                value={layout.paddingMm}
                step={0.5}
                min={0}
                max={10}
                onChange={(v) => setLayout('paddingMm', v)}
              />
              <NumField
                label="바코드 높이 (mm)"
                value={content.barcodeHeightMm}
                step={0.5}
                min={4}
                max={40}
                onChange={(v) => setContent('barcodeHeightMm', v)}
              />
              <NumField
                label="글자 크기 배율"
                value={content.fontScale}
                step={0.05}
                min={0.6}
                max={2.5}
                onChange={(v) => setContent('fontScale', v)}
              />
            </div>
          </div>

          {layout.kind === 'sheet' ? (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
              <NumField
                label="가로 칸 수"
                value={layout.cols}
                step={1}
                min={1}
                max={8}
                onChange={(v) => setLayout('cols', Math.round(v))}
              />
              <NumField
                label="세로 칸 수"
                value={layout.rows}
                step={1}
                min={1}
                max={20}
                onChange={(v) => setLayout('rows', Math.round(v))}
              />
              <NumField
                label="용지 위 여백"
                value={layout.pageMarginTopMm}
                step={0.1}
                min={0}
                max={50}
                onChange={(v) => setLayout('pageMarginTopMm', v)}
              />
              <NumField
                label="용지 왼쪽 여백"
                value={layout.pageMarginLeftMm}
                step={0.1}
                min={0}
                max={50}
                onChange={(v) => setLayout('pageMarginLeftMm', v)}
              />
              <NumField
                label="칸 좌우 간격"
                value={layout.gapXMm}
                step={0.1}
                min={0}
                max={20}
                onChange={(v) => setLayout('gapXMm', v)}
              />
              <NumField
                label="칸 위아래 간격"
                value={layout.gapYMm}
                step={0.1}
                min={0}
                max={20}
                onChange={(v) => setLayout('gapYMm', v)}
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-slate-100 pt-4">
            <Check
              label="자산명"
              checked={content.showName}
              onChange={(v) => setContent('showName', v)}
            />
            <Check
              label="보관 장소"
              checked={content.showLocation}
              onChange={(v) => setContent('showLocation', v)}
            />
            <Check
              label="관리 팀명"
              checked={content.showTeam}
              onChange={(v) => setContent('showTeam', v)}
            />
            <Check
              label="취득일"
              checked={content.showAcquiredDate}
              onChange={(v) => setContent('showAcquiredDate', v)}
            />
            <Check
              label="교회명"
              checked={content.showChurchName}
              onChange={(v) => setContent('showChurchName', v)}
            />
            {content.showChurchName ? (
              <div className="w-44">
                <input
                  className="field-input !py-1.5 text-sm"
                  placeholder="교회명 입력"
                  value={content.churchName}
                  onChange={(e) => setContent('churchName', e.target.value)}
                  maxLength={30}
                />
              </div>
            ) : null}

            <div className="ml-auto flex items-end gap-3">
              <NumField
                label="장당 매수"
                value={content.copies}
                step={1}
                min={1}
                max={20}
                onChange={(v) => setContent('copies', Math.round(v))}
              />
              {layout.kind === 'sheet' ? (
                <NumField
                  label="시작 칸 건너뛰기"
                  value={settings.skipCells}
                  step={1}
                  min={0}
                  max={Math.max(0, sheetCapacity(layout) - 1)}
                  onChange={(v) => setSettings((s) => ({ ...s, skipCells: Math.round(v) }))}
                />
              ) : null}
            </div>
          </div>
        </div>

        {!fit.fits ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900"
          >
            <strong className="font-semibold">선택한 항목이 라벨 세로 폭을 넘습니다</strong> — 필요{' '}
            <span className="mono font-semibold">{fit.neededMm.toFixed(1)}mm</span> / 인쇄 영역{' '}
            <span className="mono font-semibold">{fit.availableMm.toFixed(1)}mm</span>. 이대로
            출력하면 아래쪽이 잘립니다. 표시 항목을 줄이거나,{' '}
            <strong>바코드 높이</strong> 또는 <strong>글자 크기 배율</strong>을 낮추세요.
          </div>
        ) : null}

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">인쇄 팁</strong> — 브라우저 인쇄 창에서
          <strong> 배율(Scale)은 100%</strong>, <strong>여백(Margins)은 없음</strong>,
          <strong> 머리글·바닥글은 해제</strong>로 두세요. 라벨 프린터는 프린터 설정에서 용지
          종류를 실제 라벨 규격(예: DK-11209)으로 먼저 지정해야 크기가 맞습니다.
          라벨이 잘리거나 돌아서 나오면 드라이버의 <strong>용지 방향(가로/세로)</strong>을
          위 가로·세로 값과 맞추세요. 첫 출력은 1~2장만 시험 인쇄해 스캐너로 읽히는지
          확인하시길 권합니다.
        </div>

        <h2 className="text-sm font-bold text-slate-900">미리보기</h2>
      </div>

      <div
        className={`label-root ${
          layout.kind === 'sheet' ? 'grid justify-start' : 'flex flex-wrap'
        } gap-2 print:gap-0`}
        style={
          layout.kind === 'sheet'
            ? {
                gridTemplateColumns: `repeat(${layout.cols}, ${layout.widthMm}mm)`,
                columnGap: `${layout.gapXMm}mm`,
                rowGap: `${layout.gapYMm}mm`,
              }
            : undefined
        }
      >
        {cells.map((asset, index) =>
          asset ? (
            <LabelCell
              key={`${asset.id}-${index}`}
              asset={asset}
              layout={layout}
              content={content}
            />
          ) : (
            <div
              key={`blank-${index}`}
              className="label-cell rounded border border-dashed border-slate-300 bg-slate-50"
              style={{ width: `${layout.widthMm}mm`, height: `${layout.heightMm}mm` }}
              aria-hidden="true"
            />
          ),
        )}
      </div>
    </>
  );
}

function LabelCell({
  asset,
  layout,
  content,
}: {
  asset: LabelAsset;
  layout: LabelLayout;
  content: LabelContent;
}) {
  const metaParts: string[] = [];
  if (content.showLocation && asset.location) metaParts.push(asset.location);
  if (content.showTeam && (asset.teamName ?? asset.deptName)) {
    metaParts.push((asset.teamName ?? asset.deptName)!);
  }
  if (content.showAcquiredDate && asset.acquiredDate) {
    metaParts.push(formatDate(asset.acquiredDate));
  }

  // 바코드는 라벨 안쪽 폭을 가득 채우고(모듈 폭이 넓어져 인식이 쉬워집니다),
  // 막대 높이만 mm 로 고정합니다.
  const barcodeHeightMm = Math.min(content.barcodeHeightMm, layout.heightMm - layout.paddingMm * 2);

  // 라벨은 물리 매체라 글자 크기를 pt 로 못박고, 규격별 배율로 함께 키웁니다.
  const pt = (base: number) => `${(base * content.fontScale).toFixed(2)}pt`;

  return (
    <div
      className="label-cell flex flex-col items-center justify-center overflow-hidden rounded border border-slate-300 bg-white text-center leading-tight text-black"
      style={{
        width: `${layout.widthMm}mm`,
        height: `${layout.heightMm}mm`,
        padding: `${layout.paddingMm}mm`,
      }}
    >
      {content.showChurchName && content.churchName ? (
        <div
          style={{ fontSize: pt(FONT_BASE_PT.churchName), letterSpacing: '0.02em' }}
          className="w-full truncate"
        >
          {content.churchName}
        </div>
      ) : null}

      <div className="w-full" style={{ height: `${barcodeHeightMm}mm` }}>
        <Barcode
          value={asset.assetNo}
          moduleWidth={1}
          height={30}
          quietZone={BARCODE_QUIET_ZONE_MODULES}
          showText={false}
          stretch
          cssWidth="100%"
          cssHeight="100%"
          className="block h-full w-full"
        />
      </div>

      <div
        className="mono w-full font-bold"
        style={{
          fontSize: pt(FONT_BASE_PT.assetNo),
          letterSpacing: '0.06em',
          marginTop: '0.4mm',
        }}
      >
        {asset.assetNo}
      </div>

      {content.showName ? (
        <div
          className="w-full truncate"
          style={{ fontSize: pt(FONT_BASE_PT.name), marginTop: '0.3mm' }}
        >
          {asset.name}
        </div>
      ) : null}

      {metaParts.length > 0 ? (
        <div
          className="w-full truncate text-neutral-600"
          style={{ fontSize: pt(FONT_BASE_PT.meta) }}
        >
          {metaParts.join(' · ')}
        </div>
      ) : null}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        className="field-input mono !py-1.5 text-sm"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
