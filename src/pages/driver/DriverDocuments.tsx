import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Upload, FileText, Eye } from "lucide-react";
import { Document } from "@/types/database";
import { useSignedUrl } from "@/hooks/useSignedUrl";

const docTypes = [
  { value: "cpf", label: "CPF" },
  { value: "cnh", label: "CNH" },
  { value: "comprovante_residencia", label: "Comprovante de Residência" },
  { value: "antecedentes", label: "Certidão de Antecedentes" },
  { value: "foto_perfil", label: "Foto de Perfil" },
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

function DocumentCard({ doc }: { doc: Document }) {
  const { signedUrl, loading } = useSignedUrl(doc.file_url);
  const docType = docTypes.find((d) => d.value === doc.doc_type);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {docType?.label || doc.doc_type}
          </CardTitle>
          <Badge className={statusColors[doc.status]}>
            {statusLabels[doc.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Enviado em:{" "}
          {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
        {doc.expiry_date && (
          <p className="text-sm text-muted-foreground">
            Validade: {format(new Date(doc.expiry_date), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
        {doc.rejection_reason && (
          <p className="text-sm text-red-600">
            Motivo: {doc.rejection_reason}
          </p>
        )}
        {signedUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </a>
          </Button>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      </CardContent>
    </Card>
  );
}

export default function DriverDocuments() {
  const { toast } = useToast();
  const { driver, loading: driverLoading } = useDriverProfile();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    if (!driver) return;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner_id", driver.id)
      .eq("owner_type", "driver")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data as Document[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (driver) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [driver]);

  const handleUpload = async () => {
    if (!file || !selectedType || !driver) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${driver.id}/${selectedType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload do arquivo.",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      owner_id: driver.id,
      owner_type: "driver",
      doc_type: selectedType,
      file_url: fileName,
      status: "pending",
    });

    if (insertError) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar o documento.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Documento enviado para análise.",
      });
      setFile(null);
      setSelectedType("");
      fetchDocuments();
    }
    setUploading(false);
  };

  if (driverLoading) {
    return (
      <DriverLayout title="Meus Documentos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (!driver) {
    return (
      <DriverLayout title="Meus Documentos">
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
    <DriverLayout title="Meus Documentos" subtitle="Envie e acompanhe seus documentos">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Enviar Novo Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleUpload}
                disabled={!file || !selectedType || uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-4">Documentos Enviados</h2>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhum documento enviado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </DriverLayout>
  );
}
