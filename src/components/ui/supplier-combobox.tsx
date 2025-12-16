import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface SupplierComboboxProps {
  value?: string;
  onChange: (value: string) => void;
}

export function SupplierCombobox({ value, onChange }: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, code, name')
        .order('code');

      if (error) {
        console.error('Error fetching suppliers:', error);
      } else {
        setSuppliers(data || []);
      }
      setLoading(false);
    };

    fetchSuppliers();
  }, []);

  const selectedSupplier = suppliers.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedSupplier
            ? `${selectedSupplier.code} - ${selectedSupplier.name}`
            : 'Selecione o fornecedor...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Buscar fornecedor..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Carregando...' : 'Nenhum fornecedor encontrado.'}
            </CommandEmpty>
            <CommandGroup>
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={`${supplier.code} ${supplier.name}`}
                  onSelect={() => {
                    onChange(supplier.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === supplier.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-mono mr-2">{supplier.code}</span>
                  <span>{supplier.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
