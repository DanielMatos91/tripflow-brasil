import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Loader2 } from "lucide-react";
import { Payout } from "@/types/database";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
};

export default function DriverPayouts() {
  const { driver, loading: driverLoading } = useDriverProfile();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

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
