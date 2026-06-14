import { supabase } from './supabase';

export async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return urlData.publicUrl;
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return data.publicUrl;
}
