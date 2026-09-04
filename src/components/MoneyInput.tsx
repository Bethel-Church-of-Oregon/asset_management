'use client';

import { useState } from 'react';
import { isMoneyAmount } from '@/lib/format';

/** 금액 입력 — 입력하는 동안 천 단위 구분기호를 넣어 보여줍니다 (달러, 센트까지). */
export default function MoneyInput({
  name,
  id,
  defaultValue,
  placeholder = '0.00',
  className = 'field-input text-right mono',
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(() => format(defaultValue ?? ''));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-slate-400">
        $
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={`${className} pl-7`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(format(event.target.value))}
        onBlur={(event) => setValue(normalize(event.target.value))}
      />
    </div>
  );
}

/**
 * 입력 중 표시 형식.
 *
 * 소수점을 입력하는 도중("1234.")에도 커서가 튀지 않도록 마지막 점은 남겨 둡니다.
 */
function format(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const whole = firstDot < 0 ? cleaned : cleaned.slice(0, firstDot);
  const cents = firstDot < 0 ? null : cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);

  const digits = whole.replace(/^0+(?=\d)/, '').slice(0, 11);
  const grouped = digits === '' ? (cents === null ? '' : '0') : Number(digits).toLocaleString('en-US');
  return cents === null ? grouped : `${grouped}.${cents}`;
}

/** 포커스를 벗어날 때 센트 두 자리로 맞춥니다. */
function normalize(raw: string): string {
  const shown = format(raw);
  if (shown === '') return '';
  const [whole, cents = ''] = shown.split('.');
  const padded = `${whole}.${cents.padEnd(2, '0')}`;
  // 서버와 같은 판정으로 확인해, 저장 못 할 값을 화면에 남기지 않습니다.
  return isMoneyAmount(padded.replace(/,/g, '')) ? padded : shown;
}
