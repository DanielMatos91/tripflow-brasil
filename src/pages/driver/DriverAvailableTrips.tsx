import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Users, Briefcase, Calendar, Loader2 } from "lucide-react";
import { Trip } from "@/types/database";

export default function DriverAvailableTrips() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { driver, loading: driverLoading, isVerified } = useDriverProfile();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("status", "PUBLISHED")
      .is("driver_id", null)
      .order("pickup_datetime", { ascending: true });

    if (!error && data) {
      setTrips(data as Trip[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isVerified) {
      fetchTrips();
    } else {
      setLoading(false);
    }
  }, [isVerified]);

  const handleClaim = async (tripId: string) => {
    setClaiming(tripId);
    const { data, error } = await supabase.rpc("claim_trip", {
      _trip_id: tripId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a corrida.",
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
        toast({
          title: "Sucesso",
          description: "Corrida aceita com sucesso!",
        });
        fetchTrips();
      }
    }
    setClaiming(null);
  };

  if (driverLoading) {
    return (
      <DriverLayout title="Corridas Disponíveis">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (!driver) {
    return (
      <DriverLayout title="Corridas Disponíveis">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Você precisa completar seu cadastro de motorista para acessar as corridas.
            </p>
            <Button onClick={() => navigate("/driver/register")}>
              Completar Cadastro
            </Button>
          </CardContent>
        </Card>
      </DriverLayout>
    );
  }

  if (!isVerified) {
    return (
      <DriverLayout title="Corridas Disponíveis">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Seu cadastro ainda não foi verificado. Aguarde a aprovação dos
              seus documentos.
            </p>
          </CardContent>
        </Card>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout
      title="Corridas Disponíveis"
      subtitle="Corridas publicadas aguardando motorista"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhuma corrida disponível no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {trip.customer_name}
                  </CardTitle>
                  <Badge variant="secondary">
                    R$ {Number(trip.payout_driver).toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{trip.origin_text}</p>
                    <p className="text-muted-foreground">→ {trip.destination_text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(trip.pickup_datetime), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
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

                <Button
                  className="w-full mt-2"
                  onClick={() => handleClaim(trip.id)}
                  disabled={claiming === trip.id}
                >
                  {claiming === trip.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Aceitar Corrida
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DriverLayout>
  );
}
