import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Users, Briefcase, Calendar, Loader2, Play, CheckCircle } from "lucide-react";
import { Trip, TripStatus } from "@/types/database";

const statusLabels: Record<string, string> = {
  CLAIMED: "Aceita",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluída",
};

const statusColors: Record<string, string> = {
  CLAIMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function DriverMyTrips() {
  const { toast } = useToast();
  const { driver, loading: driverLoading } = useDriverProfile();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("CLAIMED");

  const fetchTrips = async () => {
    if (!driver) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("driver_id", driver.id)
      .in("status", ["CLAIMED", "IN_PROGRESS", "COMPLETED"])
      .order("pickup_datetime", { ascending: false });

    if (!error && data) {
      setTrips(data as Trip[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (driver) {
      fetchTrips();
    }
  }, [driver]);

  const handleStart = async (tripId: string) => {
    setActionLoading(tripId);
    const { data, error } = await supabase.rpc("start_trip", {
      _trip_id: tripId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a corrida.",
        variant: "destructive",
      });
    } else {
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: "Erro",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        });
      } else {
        toast({ title: "Sucesso", description: "Corrida iniciada!" });
        fetchTrips();
      }
    }
    setActionLoading(null);
  };

  const handleComplete = async (tripId: string) => {
    setActionLoading(tripId);
    const { data, error } = await supabase.rpc("complete_trip", {
      _trip_id: tripId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível concluir a corrida.",
        variant: "destructive",
      });
    } else {
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: "Erro",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        });
      } else {
        toast({ title: "Sucesso", description: "Corrida concluída!" });
        fetchTrips();
      }
    }
    setActionLoading(null);
  };

  const filteredTrips = trips.filter((t) => t.status === activeTab);

  if (driverLoading) {
    return (
      <DriverLayout title="Minhas Corridas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (!driver) {
    return (
      <DriverLayout title="Minhas Corridas">
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
    <DriverLayout title="Minhas Corridas" subtitle="Corridas aceitas por você">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="CLAIMED">
            Aceitas ({trips.filter((t) => t.status === "CLAIMED").length})
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">
            Em Andamento ({trips.filter((t) => t.status === "IN_PROGRESS").length})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED">
            Concluídas ({trips.filter((t) => t.status === "COMPLETED").length})
          </TabsTrigger>
        </TabsList>

        {["CLAIMED", "IN_PROGRESS", "COMPLETED"].map((status) => (
          <TabsContent key={status} value={status}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTrips.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    Nenhuma corrida {statusLabels[status].toLowerCase()}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTrips.map((trip) => (
                  <Card key={trip.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                          {trip.customer_name}
                        </CardTitle>
                        <Badge className={statusColors[trip.status]}>
                          {statusLabels[trip.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">{trip.origin_text}</p>
                          <p className="text-muted-foreground">
                            → {trip.destination_text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(
                            new Date(trip.pickup_datetime),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {trip.passengers} passageiros
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {trip.luggage} malas
                        </div>
                      </div>

                      <div className="text-sm font-medium text-primary">
                        Valor: R$ {Number(trip.payout_driver).toFixed(2)}
                      </div>

                      {trip.status === "CLAIMED" && (
                        <Button
                          className="w-full"
                          onClick={() => handleStart(trip.id)}
                          disabled={actionLoading === trip.id}
                        >
                          {actionLoading === trip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Iniciar Corrida
                        </Button>
                      )}

                      {trip.status === "IN_PROGRESS" && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => handleComplete(trip.id)}
                          disabled={actionLoading === trip.id}
                        >
                          {actionLoading === trip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Concluir Corrida
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DriverLayout>
  );
}
