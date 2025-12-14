import { cn } from '@/lib/utils';
import { TripStatus, PaymentStatus, DocumentStatus, DriverStatus, FleetStatus, PayoutStatus, VehicleStatus } from '@/types/database';

type StatusType = TripStatus | PaymentStatus | DocumentStatus | DriverStatus | FleetStatus | PayoutStatus | VehicleStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Trip statuses
  DRAFT: { label: 'Rascunho', className: 'status-draft' },
  PENDING_PAYMENT: { label: 'Aguardando Pagamento', className: 'status-pending' },
  PUBLISHED: { label: 'Publicada', className: 'status-published' },
  CLAIMED: { label: 'Aceita', className: 'status-claimed' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'status-in-progress' },
  COMPLETED: { label: 'Concluída', className: 'status-completed' },
  CANCELED: { label: 'Cancelada', className: 'status-canceled' },
  REFUNDED: { label: 'Reembolsada', className: 'status-refunded' },
  
  // Payment statuses
  pending: { label: 'Pendente', className: 'status-pending' },
  paid: { label: 'Pago', className: 'status-completed' },
  failed: { label: 'Falhou', className: 'status-canceled' },
  refunded: { label: 'Reembolsado', className: 'status-refunded' },
  
  // Document statuses
  approved: { label: 'Aprovado', className: 'status-completed' },
  rejected: { label: 'Rejeitado', className: 'status-canceled' },
  expired: { label: 'Expirado', className: 'status-pending' },
  
  // Driver/Fleet statuses
  active: { label: 'Ativo', className: 'status-completed' },
  inactive: { label: 'Inativo', className: 'status-draft' },
  blocked: { label: 'Bloqueado', className: 'status-canceled' },
  
  // Vehicle statuses
  available: { label: 'Disponível', className: 'status-completed' },
  in_use: { label: 'Em Uso', className: 'status-in-progress' },
  maintenance: { label: 'Manutenção', className: 'status-pending' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-draft' };
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
