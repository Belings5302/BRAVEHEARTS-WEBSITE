export function getYouTubeEmbedUrl(rawUrl) {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, '');
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }

    if (!videoId) return rawUrl;

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    const start = url.searchParams.get('start') || url.searchParams.get('t');
    if (start) embedUrl.searchParams.set('start', String(parseYouTubeStartTime(start)));

    return embedUrl.toString();
  } catch {
    return rawUrl;
  }
}

function parseYouTubeStartTime(value) {
  if (/^\d+$/.test(value)) return Number(value);

  const hours = value.match(/(\d+)h/)?.[1] || 0;
  const minutes = value.match(/(\d+)m/)?.[1] || 0;
  const seconds = value.match(/(\d+)s/)?.[1] || 0;

  return (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
}
