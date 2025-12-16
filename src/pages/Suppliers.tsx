import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  manager_name: string;
  created_at: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    let query = supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suppliers:', error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const columns = [
    {
      key: 'code',
      header: 'Código',
      render: (supplier: Supplier) => (
        <span className="font-mono font-semibold text-primary">
          {supplier.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nome',
    },
    {
      key: 'phone',
      header: 'Telefone',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'manager_name',
      header: 'Gerente/Responsável',
    },
    {
      key: 'created_at',
      header: 'Cadastro',
      render: (supplier: Supplier) => format(new Date(supplier.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    },
  ];

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleRowClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setDialogOpen(true);
  };

  return (
    <AdminLayout title="Fornecedores" subtitle="Gerencie os fornecedores cadastrados">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nome ou email..."
            className="max-w-sm"
          />

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingSupplier(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </DialogTitle>
              </DialogHeader>
              <SupplierForm
                onSuccess={handleSuccess}
                initialData={editingSupplier || undefined}
              />
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          keyExtractor={(supplier) => supplier.id}
          onRowClick={handleRowClick}
        />
      </div>
    </AdminLayout>
  );
}
