import Link from 'next/link';
import type { Metadata } from 'next';
import LookupManager from '@/components/LookupManager';
import UserManager from '@/components/UserManager';
import { requireSession } from '@/lib/auth';
import { canAdmin } from '@/lib/session';
import { getLookupsWithUsage, listUsers } from '@/lib/queries';
import { EXAMPLE_ASSET_NO } from '@/lib/asset-no';

export const metadata: Metadata = { title: '설정' };

export default async function SettingsPage() {
  const session = await requireSession();

  if (!canAdmin(session.role)) {
    return (
      <div className="card px-6 py-16 text-center">
        <h1 className="text-lg font-bold text-slate-900">관리자 전용 화면입니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          기준정보와 계정 관리는 관리자만 볼 수 있습니다.
        </p>
        <Link href="/account" className="btn-secondary mt-6">
          내 계정 설정으로
        </Link>
      </div>
    );
  }

  const [lookups, users] = await Promise.all([getLookupsWithUsage(), listUsers()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">설정</h1>
        <p className="mt-1 text-sm text-slate-500">
          자산번호에 쓰이는 코드와 사용자 계정을 관리합니다.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <p className="font-semibold text-slate-800">자산번호 구성</p>
        <p className="mono mt-1.5 text-lg font-bold tracking-wider text-brand-700">
          YY - BBDD - SSSS
        </p>
        <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
          <li>
            <span className="mono font-semibold text-slate-800">YY</span> 취득 연도 2자리
          </li>
          <li>
            <span className="mono font-semibold text-slate-800">BB</span> 건물/위치 번호 2자리 —
            아래 &lsquo;건물 · 위치&rsquo;에서 관리
          </li>
          <li>
            <span className="mono font-semibold text-slate-800">DD</span> 관리부서 번호 2자리 —
            아래 &lsquo;관리부서&rsquo;에서 관리
          </li>
          <li>
            <span className="mono font-semibold text-slate-800">SSSS</span> 물품 고유번호 4자리 —
            등록 시 자동 부여
          </li>
          <li className="pt-1 text-slate-500">
            모든 자리는 0 으로 채웁니다 — 예){' '}
            <span className="mono text-slate-700">{EXAMPLE_ASSET_NO}</span>
          </li>
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LookupManager
          kind="building"
          title="건물 · 위치"
          description="자산번호 3번째 자리에 들어갑니다. 예) 1 비전, 2 은혜, 3 은혜성전, 4 창고"
          rows={lookups.buildings}
        />
        <LookupManager
          kind="department"
          title="관리부서"
          description="자산번호 4번째 자리에 들어갑니다. 예) 1 예배사역원, 2 선교팀"
          rows={lookups.departments}
        />
      </div>

      <UserManager users={users} currentUserId={session.userId} />

      <p className="text-xs leading-relaxed text-slate-500">
        코드를 사용하는 자산이 있으면 삭제 대신 &lsquo;사용 안함&rsquo;으로 바뀝니다. 이미 부여된
        자산번호는 그대로 유지되고, 새 자산 등록 목록에서만 빠집니다.
      </p>
    </div>
  );
}
