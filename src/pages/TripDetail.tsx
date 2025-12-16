import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Payment } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  Briefcase,
  CreditCard,
  FileText,
  Clock,
  Edit,
  Send,
  XCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { TripForm } from '@/components/trips/TripForm';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [driverInfo, setDriverInfo] = useState<{ name: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTrip();
      fetchPayment();
    }
  }, [id]);

  const fetchTrip = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        driver:drivers(
          id,
          user_id,
          profile:profiles(name)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setTrip(data);
      if (data.driver) {
        setDriverInfo({
          name: data.driver.profile?.name || 'Sem nome',
          id: data.driver.id,
        });
      }
    }
    setLoading(false);
  };

  const fetchPayment = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setPayment(data);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleInitiatePayment = async () => {
    if (!trip) return;
    setActionLoading(true);

    // Create payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      trip_id: trip.id,
      amount: trip.price_customer,
      method: 'PIX',
      status: 'pending',
    });

    if (paymentError) {
      toast.error('Erro ao criar pagamento');
      setActionLoading(false);
      return;
    }

    // Update trip status
    const { error: tripError } = await supabase
      .from('trips')
      .update({ status: 'PENDING_PAYMENT' })
      .eq('id', trip.id);

    if (tripError) {
      toast.error('Erro ao atualizar corrida');
    } else {
      toast.success('Pagamento iniciado! Link enviado ao cliente.');
      fetchTrip();
      fetchPayment();
    }
    setActionLoading(false);
  };

  const handleSimulatePayment = async () => {
    if (!payment) return;
    setActionLoading(true);

    // Simulate webhook - mark payment as paid
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.id);

    if (paymentError) {
      toast.error('Erro ao confirmar pagamento');
      setActionLoading(false);
      return;
    }

    // Publish trip
    const { error: tripError } = await supabase
      .from('trips')
      .update({ status: 'PUBLISHED' })
      .eq('id', trip?.id);

    if (tripError) {
      toast.error('Erro ao publicar corrida');
    } else {
      toast.success('Pagamento confirmado! Corrida publicada.');
      fetchTrip();
      fetchPayment();
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!trip) return;
    setActionLoading(true);

    const { error } = await supabase
      .from('trips')
      .update({
        status: 'CANCELED',
        cancel_reason: cancelReason,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', trip.id);

    if (error) {
      toast.error('Erro ao cancelar corrida');
    } else {
      toast.success('Corrida cancelada');
      fetchTrip();
    }
    setCancelDialogOpen(false);
    setCancelReason('');
    setActionLoading(false);
  };

  const handleRefund = async () => {
    if (!trip || !payment) return;
    setActionLoading(true);

    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', payment.id);

    const { error: tripError } = await supabase
      .from('trips')
      .update({ status: 'REFUNDED' })
      .eq('id', trip.id);

    if (paymentError || tripError) {
      toast.error('Erro ao processar reembolso');
    } else {
      toast.success('Reembolso registrado');
      fetchTrip();
      fetchPayment();
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Carregando..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!trip) {
    return (
      <AdminLayout title="Corrida não encontrada" subtitle="">
        <Button onClick={() => navigate('/admin/trips')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Corrida #${trip.id.slice(0, 8)}`}
      subtitle={format(parseISO(trip.pickup_datetime), "dd 'de' MMMM 'às' HH:mm", {
        locale: ptBR,
      })}
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/trips')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trip Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes da Corrida
            </CardTitle>
            <StatusBadge status={trip.status} />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Origem</p>
                <p className="font-medium">{trip.origin_text}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Destino</p>
                <p className="font-medium">{trip.destination_text}</p>
              </div>
            </div>

            {/* Customer */}
            <div className="border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <User className="h-4 w-4" /> Cliente
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{trip.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </p>
                  <p className="font-medium">{trip.customer_phone}</p>
                </div>
                {trip.customer_email && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="font-medium">{trip.customer_email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" /> Detalhes
              </h4>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data/Hora
                  </p>
                  <p className="font-medium">
                    {format(parseISO(trip.pickup_datetime), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Passageiros
                  </p>
                  <p className="font-medium">{trip.passengers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Malas
                  </p>
                  <p className="font-medium">{trip.luggage}</p>
                </div>
              </div>
              {trip.notes && (
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="rounded-lg bg-muted/50 p-3 text-sm">{trip.notes}</p>
                </div>
              )}
            </div>

            {/* Driver Info */}
            {driverInfo && (
              <div className="border-t pt-4">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" /> Motorista
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{driverInfo.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-medium font-mono text-sm">{driverInfo.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <CreditCard className="h-4 w-4" /> Valores
              </h4>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Cliente</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(trip.price_customer)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Repasse Motorista</p>
                  <p className="font-medium">{formatCurrency(trip.payout_driver)}</p>
                </div>
                {trip.estimated_costs !== null && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Custos Estimados</p>
                    <p className="font-medium">{formatCurrency(trip.estimated_costs)}</p>
                  </div>
                )}
                {trip.calculated_margin !== null && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Margem</p>
                    <p className={`font-medium ${trip.calculated_margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(trip.calculated_margin)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions & Payment */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.status === 'DRAFT' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Corrida
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleInitiatePayment}
                    disabled={actionLoading}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Iniciar Pagamento
                  </Button>
                </>
              )}

              {trip.status === 'PENDING_PAYMENT' && (
                <Button
                  className="w-full"
                  onClick={handleSimulatePayment}
                  disabled={actionLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Simular Confirmação (Webhook)
                </Button>
              )}

              {['COMPLETED', 'CANCELED'].includes(trip.status) && payment?.status === 'paid' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleRefund}
                  disabled={actionLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Registrar Reembolso
                </Button>
              )}

              {!['CANCELED', 'REFUNDED', 'COMPLETED'].includes(trip.status) && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Corrida
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          {payment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={payment.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-medium">{payment.method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">{formatCurrency(Number(payment.amount))}</span>
                </div>
                {payment.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pago em</span>
                    <span className="font-medium">
                      {format(parseISO(payment.paid_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">Criada</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(trip.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                {trip.claimed_at && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-info" />
                    <div>
                      <p className="font-medium">Aceita por motorista</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(trip.claimed_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
                {trip.started_at && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-warning" />
                    <div>
                      <p className="font-medium">Iniciada</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(trip.started_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
                {trip.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-success" />
                    <div>
                      <p className="font-medium">Concluída</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(trip.completed_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
                {trip.canceled_at && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-destructive" />
                    <div>
                      <p className="font-medium">Cancelada</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(trip.canceled_at), "dd/MM/yyyy HH:mm")}
                      </p>
                      {trip.cancel_reason && (
                        <p className="text-sm text-destructive">{trip.cancel_reason}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Corrida</DialogTitle>
          </DialogHeader>
          <TripForm
            tripId={trip.id}
            initialData={{
              customer_name: trip.customer_name,
              customer_phone: trip.customer_phone,
              customer_email: trip.customer_email || '',
              origin_text: trip.origin_text,
              destination_text: trip.destination_text,
              pickup_datetime: trip.pickup_datetime.slice(0, 16),
              passengers: trip.passengers,
              luggage: trip.luggage,
              price_customer: trip.price_customer,
              payout_driver: trip.payout_driver,
              estimated_costs: trip.estimated_costs || 0,
              notes: trip.notes || '',
            }}
            onSuccess={() => {
              setEditDialogOpen(false);
              fetchTrip();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Corrida</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo do cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={!cancelReason.trim() || actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Corrida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
