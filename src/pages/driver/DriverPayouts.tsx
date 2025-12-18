import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, CreditCard, CheckCircle2, ExternalLink } from "lucide-react";
import { Payout } from "@/types/database";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
};

export default function DriverPayouts() {
  const { driver, loading: driverLoading, isStripeConnected, refetch } = useDriverProfile();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    if (!driver) {
      setLoading(false);
      return;
    }

    const fetchPayouts = async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPayouts(data as Payout[]);
      }
      setLoading(false);
    };

    fetchPayouts();
  }, [driver]);

  // Check for Stripe return URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") === "true") {
      toast.success("Conta Stripe conectada com sucesso!");
      refetch();
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("stripe_refresh") === "true") {
      toast.info("Por favor, complete o cadastro no Stripe.");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetch]);

  const handleConnectStripe = async () => {
    if (!driver) return;
    
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { type: "driver", entity_id: driver.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        if (data.already_connected) {
          toast.info("Abrindo painel Stripe...");
        }
      }
    } catch (error: any) {
      console.error("Stripe connect error:", error);
      toast.error("Erro ao conectar com Stripe: " + (error.message || "Tente novamente"));
    } finally {
      setConnectingStripe(false);
    }
  };

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  if (driverLoading) {
    return (
      <DriverLayout title="Meus Repasses">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (!driver) {
    return (
      <DriverLayout title="Meus Repasses">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Você não possui um perfil de motorista cadastrado.
            </p>
          </CardContent>
        </Card>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout title="Meus Repasses" subtitle="Histórico de repasses recebidos">
      {/* Stripe Connect Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Conta de Recebimento
          </CardTitle>
          <CardDescription>
            Conecte sua conta para receber repasses automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStripeConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Conta Stripe conectada</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                {connectingStripe ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Gerenciar conta
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Para receber seus repasses, você precisa conectar uma conta bancária via Stripe.
              </p>
              <Button onClick={handleConnectStripe} disabled={connectingStripe}>
                {connectingStripe ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Conectar conta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-2xl font-bold text-yellow-600">
              R$ {totalPending.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Recebido</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalPaid.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : payouts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhum repasse encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    {format(new Date(payout.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {Number(payout.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{payout.method || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[payout.status]}>
                      {statusLabels[payout.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payout.payment_date
                      ? format(new Date(payout.payment_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </DriverLayout>
  );
}
