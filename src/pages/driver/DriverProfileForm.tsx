import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const driverProfileSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  cnh: z.string().min(9, "CNH deve ter no mínimo 9 caracteres").max(20, "CNH inválida"),
  cnh_expiry: z.string().min(1, "Data de validade é obrigatória"),
  pix_key: z.string().optional(),
  bank_name: z.string().optional(),
  bank_agency: z.string().optional(),
  bank_account: z.string().optional(),
});

type DriverProfileData = z.infer<typeof driverProfileSchema>;

export default function DriverProfileForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<DriverProfileData>({
    cpf: "",
    cnh: "",
    cnh_expiry: "",
    pix_key: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = driverProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("drivers").insert({
      user_id: user.id,
      cpf: formData.cpf,
      cnh: formData.cnh,
      cnh_expiry: formData.cnh_expiry,
      pix_key: formData.pix_key || null,
      bank_name: formData.bank_name || null,
      bank_agency: formData.bank_agency || null,
      bank_account: formData.bank_account || null,
      status: "pending",
      verified: false,
    });

    setLoading(false);

    if (error) {
      console.error("Error creating driver profile:", error);
      toast({
        title: "Erro",
        description: error.message.includes("duplicate")
          ? "Você já possui um perfil de motorista cadastrado."
          : "Não foi possível criar o perfil. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso!",
      description: "Perfil cadastrado! Agora você pode enviar seus documentos.",
    });

    navigate("/driver/documents");
  };

  return (
    <DriverLayout title="Completar Cadastro" subtitle="Preencha seus dados para se tornar um motorista">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dados do Motorista</CardTitle>
          <CardDescription>
            Preencha os dados obrigatórios para completar seu cadastro. Após o envio, um administrador irá verificar suas informações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength={14}
                />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnh">CNH *</Label>
                <Input
                  id="cnh"
                  name="cnh"
                  placeholder="Número da CNH"
                  value={formData.cnh}
                  onChange={handleChange}
                  maxLength={20}
                />
                {errors.cnh && <p className="text-sm text-destructive">{errors.cnh}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnh_expiry">Validade da CNH *</Label>
                <Input
                  id="cnh_expiry"
                  name="cnh_expiry"
                  type="date"
                  value={formData.cnh_expiry}
                  onChange={handleChange}
                />
                {errors.cnh_expiry && <p className="text-sm text-destructive">{errors.cnh_expiry}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  name="pix_key"
                  placeholder="CPF, email, telefone ou chave aleatória"
                  value={formData.pix_key}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-4 text-muted-foreground">Dados Bancários (opcional)</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    placeholder="Nome do banco"
                    value={formData.bank_name}
                    onChange={handleChange}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_agency">Agência</Label>
                  <Input
                    id="bank_agency"
                    name="bank_agency"
                    placeholder="0000"
                    value={formData.bank_agency}
                    onChange={handleChange}
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account">Conta</Label>
                  <Input
                    id="bank_account"
                    name="bank_account"
                    placeholder="00000-0"
                    value={formData.bank_account}
                    onChange={handleChange}
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar e Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DriverLayout>
  );
}
