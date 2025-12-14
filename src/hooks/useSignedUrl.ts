import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSignedUrl(filePath: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    // If it's already a full URL (legacy), use it directly
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      setSignedUrl(filePath);
      return;
    }

    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setError('Erro ao carregar documento');
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error:', err);
        setError('Erro inesperado');
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [filePath]);

  return { signedUrl, loading, error };
}

export async function getSignedUrl(filePath: string): Promise<string | null> {
  // If it's already a full URL (legacy), use it directly
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}
