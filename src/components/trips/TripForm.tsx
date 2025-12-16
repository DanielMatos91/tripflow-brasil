import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SupplierCombobox } from '@/components/ui/supplier-combobox';

const tripSchema = z.object({
  supplier_id: z.string().min(1, 'Fornecedor é obrigatório'),
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_phone: z.string().min(10, 'Telefone inválido'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  origin_text: z.string().min(3, 'Origem é obrigatória'),
  destination_text: z.string().min(3, 'Destino é obrigatório'),
  pickup_datetime: z.string().min(1, 'Data/hora é obrigatória'),
  flight_code: z.string().optional(),
  arrival_time: z.string().optional(),
  passengers: z.coerce.number().min(1, 'Mínimo 1 passageiro'),
  luggage: z.coerce.number().min(0, 'Valor inválido'),
  price_customer: z.coerce.number().min(1, 'Valor do cliente é obrigatório'),
  payout_driver: z.coerce.number().min(1, 'Valor do repasse é obrigatório'),
  estimated_costs: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface TripFormProps {
  onSuccess: () => void;
  initialData?: Partial<TripFormData>;
  tripId?: string;
}

export function TripForm({ onSuccess, initialData, tripId }: TripFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || '',
      customer_name: initialData?.customer_name || '',
      customer_phone: initialData?.customer_phone || '',
      customer_email: initialData?.customer_email || '',
      origin_text: initialData?.origin_text || '',
      destination_text: initialData?.destination_text || '',
      pickup_datetime: initialData?.pickup_datetime || '',
      flight_code: initialData?.flight_code || '',
      arrival_time: initialData?.arrival_time || '',
      passengers: initialData?.passengers || 1,
      luggage: initialData?.luggage || 0,
      price_customer: initialData?.price_customer || 0,
      payout_driver: initialData?.payout_driver || 0,
      estimated_costs: initialData?.estimated_costs || 0,
      notes: initialData?.notes || '',
    },
  });

  const onSubmit = async (data: TripFormData) => {
    setLoading(true);

    const margin = data.price_customer - data.payout_driver - (data.estimated_costs || 0);

    const tripData = {
      supplier_id: data.supplier_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || null,
      origin_text: data.origin_text,
      destination_text: data.destination_text,
      pickup_datetime: data.pickup_datetime,
      flight_code: data.flight_code || null,
      arrival_time: data.arrival_time || null,
      passengers: data.passengers,
      luggage: data.luggage,
      price_customer: data.price_customer,
      payout_driver: data.payout_driver,
      estimated_costs: data.estimated_costs || null,
      notes: data.notes || null,
      calculated_margin: margin,
      created_by: user?.id || null,
    };

    let error;

    if (tripId) {
      const result = await supabase
        .from('trips')
        .update(tripData)
        .eq('id', tripId);
      error = result.error;
    } else {
      const result = await supabase.from('trips').insert(tripData);
      error = result.error;
    }

    if (error) {
      toast.error('Erro ao salvar corrida');
      console.error(error);
    } else {
      toast.success(tripId ? 'Corrida atualizada!' : 'Corrida criada!');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Supplier */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Fornecedor</h3>
          <FormField
            control={form.control}
            name="supplier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Fornecedor *</FormLabel>
                <FormControl>
                  <SupplierCombobox value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Customer Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Dados do Cliente</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Route Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Trajeto</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="origin_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço de origem" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço de destino" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pickup_datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Flight Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Informações do Voo</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="flight_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Voo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: LA3456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="arrival_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de Chegada</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Detalhes</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="passengers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passageiros</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="luggage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Malas</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Valores</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="price_customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Cliente (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payout_driver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repasse Motorista (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimated_costs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custos Estimados (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações adicionais..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tripId ? 'Salvar Alterações' : 'Criar Corrida'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
