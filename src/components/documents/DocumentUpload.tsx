import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  ownerType: 'driver' | 'fleet' | 'vehicle';
  ownerId: string;
  onUploadComplete: () => void;
}

const DOCUMENT_TYPES: Record<string, string[]> = {
  driver: ['CNH', 'RG', 'CPF', 'Comprovante de Residência', 'Antecedentes Criminais', 'Outro'],
  fleet: ['Contrato Social', 'CNPJ', 'Alvará', 'Licença de Operação', 'Outro'],
  vehicle: ['CRLV', 'Seguro', 'Laudo de Vistoria', 'Outro'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function DocumentUpload({ ownerType, ownerId, onUploadComplete }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, JPEG, PNG ou WebP');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !docType) {
      toast.error('Selecione um arquivo e tipo de documento');
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path: ownerType/ownerId/timestamp-filename
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${ownerType}/${ownerId}/${timestamp}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo');
        return;
      }

      // Get the file URL (signed URL for private bucket)
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (!urlData?.signedUrl) {
        toast.error('Erro ao gerar URL do documento');
        return;
      }

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          doc_type: docType,
          file_url: filePath, // Store the path, not the signed URL
          expiry_date: expiryDate || null,
          status: 'pending',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Erro ao registrar documento');
        return;
      }

      toast.success('Documento enviado com sucesso!');
      setOpen(false);
      resetForm();
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro inesperado ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setDocType('');
    setExpiryDate('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Enviar Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
          <DialogDescription>
            Selecione o tipo de documento e faça upload do arquivo.
            Formatos aceitos: PDF, JPEG, PNG, WebP. Máximo: 10MB.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="docType">Tipo de Documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES[ownerType]?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expiryDate">Data de Validade (opcional)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file">Arquivo</Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !docType}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
