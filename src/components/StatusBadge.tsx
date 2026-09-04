import type { AssetStatus, MaintenanceKind } from '@/db/schema';
import {
  MAINTENANCE_CLASSES,
  MAINTENANCE_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
} from '@/lib/constants';

export function StatusBadge({ status }: { status: AssetStatus }) {
  return <span className={`badge ${STATUS_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function MaintenanceBadge({ kind }: { kind: MaintenanceKind }) {
  return <span className={`badge ${MAINTENANCE_CLASSES[kind]}`}>{MAINTENANCE_LABELS[kind]}</span>;
}
