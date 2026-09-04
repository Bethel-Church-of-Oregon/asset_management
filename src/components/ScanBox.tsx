'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCamera, IconScan } from './icons';
import { EXAMPLE_ASSET_NO, normalizeAssetNo } from '@/lib/asset-no';

type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error';

/**
 * 자산번호 조회 입력창.
 *
 * 1) USB/블루투스 바코드 스캐너 — 대부분 키보드처럼 값을 입력한 뒤 Enter 를 보냅니다.
 *    그래서 이 입력창에 포커스만 있으면 별도 설정 없이 바로 동작합니다.
 * 2) 휴대폰 카메라 — 버튼을 누르면 zxing 으로 Code128/QR 을 인식합니다.
 * 3) 직접 입력 — 하이픈은 있어도 없어도 됩니다.
 */
export default function ScanBox({ initialValue = '' }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [lastHit, setLastHit] = useState<string | null>(null);

  const go = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      router.push(`/scan?q=${encodeURIComponent(trimmed)}`);
    },
    [router],
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamera('idle');
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      setCameraMessage(
        '이 브라우저에서는 카메라 스캔을 지원하지 않습니다. 번호를 직접 입력하세요.',
      );
      return;
    }

    setCamera('starting');
    setCameraMessage(null);

    try {
      // zxing 은 무겁기 때문에 카메라를 켤 때만 내려받습니다.
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      const video = videoRef.current;
      if (!video) return;

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        video,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const assetNo = normalizeAssetNo(text);
          setLastHit(assetNo ?? text);
          // 인식되면 즉시 카메라를 끄고 조회로 넘어갑니다.
          controls.stop();
          controlsRef.current = null;
          setCamera('idle');
          setValue(assetNo ?? text);
          go(assetNo ?? text);
        },
      );

      controlsRef.current = controls;
      setCamera('running');
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCamera('denied');
        setCameraMessage(
          '카메라 권한이 거부되었습니다. 브라우저 주소창의 자물쇠 아이콘에서 권한을 허용하세요. (카메라는 https 또는 localhost 에서만 동작합니다)',
        );
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCamera('error');
        setCameraMessage('사용할 수 있는 카메라를 찾지 못했습니다.');
      } else {
        setCamera('error');
        setCameraMessage('카메라를 시작할 수 없습니다. 번호를 직접 입력하세요.');
      }
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go(value);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
            <IconScan />
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field-input mono !py-3 pl-10 text-lg tracking-wider"
            placeholder={EXAMPLE_ASSET_NO}
            aria-label="자산번호 또는 검색어"
            autoComplete="off"
            autoFocus
            inputMode="search"
            enterKeyHint="search"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0 !px-5">
          조회
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {camera === 'running' || camera === 'starting' ? (
          <button type="button" onClick={stopCamera} className="btn-secondary !py-1.5 text-xs">
            카메라 끄기
          </button>
        ) : (
          <button type="button" onClick={startCamera} className="btn-secondary !py-1.5 text-xs">
            <IconCamera />
            카메라로 스캔
          </button>
        )}
        <p className="text-xs text-slate-500">
          USB 바코드 스캐너는 입력창을 클릭한 뒤 그냥 스캔하면 됩니다.
        </p>
      </div>

      {cameraMessage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {cameraMessage}
        </p>
      ) : null}

      <div
        className={
          camera === 'running' || camera === 'starting'
            ? 'overflow-hidden rounded-xl border border-slate-300 bg-black'
            : 'hidden'
        }
      >
        <video
          ref={videoRef}
          className="mx-auto block max-h-72 w-full object-cover"
          muted
          playsInline
        />
        <p className="bg-slate-900 py-1.5 text-center text-xs text-slate-300">
          {camera === 'starting' ? '카메라 준비 중...' : '바코드를 화면 가운데에 맞춰 주세요'}
        </p>
      </div>

      {lastHit ? (
        <p className="text-xs text-slate-500">
          최근 인식: <span className="mono font-semibold text-slate-700">{lastHit}</span>
        </p>
      ) : null}
    </div>
  );
}
