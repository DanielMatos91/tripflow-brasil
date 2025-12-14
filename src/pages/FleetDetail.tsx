import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Fleet, Document, Vehicle } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Ban,
  Car,
  Phone,
  Mail,
  User,
} from 'lucide-react';
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
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { getSignedUrl } from '@/hooks/useSignedUrl';

export default function FleetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'block' | 'activate' | 'reject';
    documentId?: string;
  }>({ open: false, type: 'block' });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchFleet();
      fetchDocuments();
      fetchVehicles();
    }
  }, [id]);

  const fetchFleet = async () => {
    const { data, error } = await supabase
      .from('fleets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setFleet(data);
    }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_type', 'fleet')
      .eq('owner_id', id)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data as unknown as Document[]);
    }
  };

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('fleet_id', id)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data);
    }
  };

  const handleBlock = async () => {
    const { error } = await supabase
      .from('fleets')
      .update({ status: 'blocked' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao bloquear frota');
    } else {
      toast.success('Frota bloqueada');
      fetchFleet();
    }
    setActionDialog({ open: false, type: 'block' });
  };

  const handleActivate = async () => {
    const { error } = await supabase
      .from('fleets')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao ativar frota');
    } else {
      toast.success('Frota ativada');
      fetchFleet();
    }
    setActionDialog({ open: false, type: 'activate' });
  };

  const handleApproveDocument = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', docId);

    if (error) {
      toast.error('Erro ao aprovar documento');
    } else {
      toast.success('Documento aprovado');
      fetchDocuments();
    }
  };

  const handleRejectDocument = async () => {
    if (!actionDialog.documentId) return;

    const { error } = await supabase
      .from('documents')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', actionDialog.documentId);

    if (error) {
      toast.error('Erro ao rejeitar documento');
    } else {
      toast.success('Documento rejeitado');
      fetchDocuments();
    }
    setActionDialog({ open: false, type: 'reject' });
    setRejectionReason('');
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

  if (!fleet) {
    return (
      <AdminLayout title="Frota não encontrada" subtitle="">
        <Button onClick={() => navigate('/fleets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={fleet.company_name}
      subtitle="Detalhes da frota"
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/fleets')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
            <StatusBadge status={fleet.status} />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{fleet.company_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-mono font-medium">{fleet.cnpj}</p>
              </div>
            </div>

            {/* Contact */}
            <div className="border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <User className="h-4 w-4" /> Contato
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{fleet.contact_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </p>
                  <p className="font-medium">{fleet.contact_phone || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium">{fleet.contact_email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Bank Info */}
            {(fleet.bank_name || fleet.pix_key) && (
              <div className="border-t pt-4">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <CreditCard className="h-4 w-4" /> Dados Bancários
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fleet.bank_name && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Banco</p>
                      <p className="font-medium">{fleet.bank_name}</p>
                    </div>
                  )}
                  {fleet.bank_agency && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Agência</p>
                      <p className="font-mono font-medium">{fleet.bank_agency}</p>
                    </div>
                  )}
                  {fleet.bank_account && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Conta</p>
                      <p className="font-mono font-medium">{fleet.bank_account}</p>
                    </div>
                  )}
                  {fleet.pix_key && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Chave PIX</p>
                      <p className="font-mono font-medium">{fleet.pix_key}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fleet.status === 'blocked' ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActionDialog({ open: true, type: 'activate' })}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Reativar Frota
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setActionDialog({ open: true, type: 'block' })}
              >
                <Ban className="mr-2 h-4 w-4" />
                Bloquear Frota
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Veículos ({vehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum veículo cadastrado
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{vehicle.plate}</span>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.brand} {vehicle.model} {vehicle.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.vehicle_type} • {vehicle.seats} lugares
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
            <DocumentUpload
              ownerType="fleet"
              ownerId={id!}
              onUploadComplete={fetchDocuments}
            />
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum documento enviado
              </p>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{doc.doc_type}</span>
                      <StatusBadge status={doc.status} />
                    </div>

                    {doc.expiry_date && (
                      <p className="text-sm text-muted-foreground">
                        Validade: {format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}
                      </p>
                    )}

                    {doc.rejection_reason && (
                      <p className="text-sm text-destructive">
                        Motivo: {doc.rejection_reason}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          const url = await getSignedUrl(doc.file_url);
                          if (url) window.open(url, '_blank');
                          else toast.error('Erro ao carregar documento');
                        }}
                      >
                        Ver arquivo
                      </Button>

                      {doc.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:bg-success/10"
                            onClick={() => handleApproveDocument(doc.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'reject',
                                documentId: doc.id,
                              })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialogs */}
      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'block'}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear Frota</AlertDialogTitle>
            <AlertDialogDescription>
              A frota e seus motoristas não poderão aceitar novas corridas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'activate'}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Frota</AlertDialogTitle>
            <AlertDialogDescription>
              A frota poderá voltar a operar normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>Reativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'reject'}
        onOpenChange={(open) => {
          setActionDialog({ ...actionDialog, open });
          if (!open) setRejectionReason('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectDocument}
              disabled={!rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
