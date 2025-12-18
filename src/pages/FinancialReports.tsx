import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Clock, FileText, Download } from "lucide-react";
import { format, subDays } from "date-fns";

interface FinancialReport {
  period: { start_date: string; end_date: string };
  stripe: {
    balance: { available: number; pending: number };
    revenue: number;
    invoiced: number;
    paid_invoices: number;
    pending_invoices: number;
    transfers: number;
  };
  trips: {
    count: number;
    customer_revenue: number;
    driver_costs: number;
    gross_margin: number;
  };
  payouts: {
    pending: number;
    paid: number;
    total: number;
  };
  by_supplier: Array<{
    name: string;
    code: string;
    trips: number;
    revenue: number;
    margin: number;
  }>;
}

export default function FinancialReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("financial-reports", {
        body: { start_date: startDate, end_date: endDate },
      });

      if (error) throw error;
      setReport(data);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const exportCSV = () => {
    if (!report) return;

    const rows = [
      ["Relatório Financeiro"],
      [`Período: ${startDate} a ${endDate}`],
      [],
      ["RESUMO GERAL"],
      ["Receita de Corridas", formatCurrency(report.trips.customer_revenue)],
      ["Custos com Motoristas", formatCurrency(report.trips.driver_costs)],
      ["Margem Bruta", formatCurrency(report.trips.gross_margin)],
      [],
      ["STRIPE"],
      ["Saldo Disponível", formatCurrency(report.stripe.balance.available)],
      ["Saldo Pendente", formatCurrency(report.stripe.balance.pending)],
      ["Invoices Pagos", formatCurrency(report.stripe.paid_invoices)],
      ["Invoices Pendentes", formatCurrency(report.stripe.pending_invoices)],
      [],
      ["REPASSES"],
      ["Repasses Pendentes", formatCurrency(report.payouts.pending)],
      ["Repasses Pagos", formatCurrency(report.payouts.paid)],
      [],
      ["POR FORNECEDOR"],
      ["Código", "Nome", "Corridas", "Receita", "Margem"],
      ...report.by_supplier.map((s) => [s.code, s.name, s.trips.toString(), formatCurrency(s.revenue), formatCurrency(s.margin)]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${startDate}-${endDate}.csv`;
    link.click();
  };

  return (
    <AdminLayout title="Relatórios Financeiros" subtitle="Análise de receitas, custos e margens">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fim</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={fetchReport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Gerar Relatório
              </Button>
              {report && (
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.trips.customer_revenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">{report.trips.count} corridas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Custos Motoristas</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.trips.driver_costs)}
                  </div>
                  <p className="text-xs text-muted-foreground">Repasses devidos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(report.trips.gross_margin)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.trips.customer_revenue > 0
                      ? ((report.trips.gross_margin / report.trips.customer_revenue) * 100).toFixed(1)
                      : 0}
                    % da receita
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Repasses Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(report.payouts.pending)}
                  </div>
                  <p className="text-xs text-muted-foreground">A pagar</p>
                </CardContent>
              </Card>
            </div>

            {/* Stripe Balance */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Saldo Stripe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disponível</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(report.stripe.balance.available)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendente</span>
                      <span className="font-medium text-yellow-600">
                        {formatCurrency(report.stripe.balance.pending)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Faturado</span>
                      <span className="font-medium">{formatCurrency(report.stripe.invoiced)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recebidos</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(report.stripe.paid_invoices)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Em Aberto</span>
                      <span className="font-medium text-yellow-600">
                        {formatCurrency(report.stripe.pending_invoices)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* By Supplier Table */}
            <Card>
              <CardHeader>
                <CardTitle>Receita por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Corridas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">% Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_supplier.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum dado encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.by_supplier.map((supplier) => (
                        <TableRow key={supplier.code}>
                          <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell className="text-right">{supplier.trips}</TableCell>
                          <TableCell className="text-right">{formatCurrency(supplier.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(supplier.margin)}</TableCell>
                          <TableCell className="text-right">
                            {supplier.revenue > 0
                              ? ((supplier.margin / supplier.revenue) * 100).toFixed(1)
                              : 0}
                            %
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
