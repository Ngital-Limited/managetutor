import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdSlotProps {
  slot: string;
  width?: number;
  height?: number;
  className?: string;
}

interface AdRow {
  id: string;
  ad_type: 'image' | 'gif' | 'html';
  image_url: string | null;
  link_url: string | null;
  html_content: string | null;
  width: number;
  height: number;
}

export function AdSlot({ slot, width = 300, height = 250, className }: AdSlotProps) {
  const [ad, setAd] = useState<AdRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('ad_placements')
        .select('id, ad_type, image_url, link_url, html_content, width, height')
        .eq('slot', slot)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      setAd(data as AdRow | null);
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [slot]);

  if (!loaded || !ad) return null;

  const w = ad.width || width;
  const h = ad.height || height;

  const inner = ad.ad_type === 'html' ? (
    <div
      style={{ width: w, height: h, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: ad.html_content || '' }}
    />
  ) : ad.image_url ? (
    <img
      src={ad.image_url}
      alt="Advertisement"
      width={w}
      height={h}
      loading="lazy"
      style={{ width: w, height: h, objectFit: 'cover', display: 'block' }}
    />
  ) : null;

  if (!inner) return null;

  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: w, aspectRatio: `${w} / ${h}` }}
      aria-label="Sponsored"
    >
      {ad.link_url && ad.ad_type !== 'html' ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block', width: '100%', height: '100%' }}>
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
