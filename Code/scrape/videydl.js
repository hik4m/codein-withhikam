import axios from 'axios'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
}

function parseVideyInput(input) {
  if (typeof input !== 'string') return null

  // CASE 1: Already direct CDN link
  const cdnMatch = input.match(
    /^https?:\/\/cdn\.videy\.co\/([a-zA-Z0-9]+)\.mp4/i
  )
  if (cdnMatch) {
    return {
      id: cdnMatch[1],
      directUrl: input
    }
  }

  // CASE 2: Normal videy.co links
  const patterns = [
    /videy\.co\/v\/\?id=([a-zA-Z0-9]+)/i,
    /videy\.co\/v\/([a-zA-Z0-9]+)/i,
    /videy\.co\/([a-zA-Z0-9]+)/i
  ]

  for (const r of patterns) {
    const m = input.match(r)
    if (m && m[1]) {
      return {
        id: m[1],
        directUrl: `https://cdn.videy.co/${m[1]}.mp4`
      }
    }
  }

  return null
}

async function resolveVidey(input) {
  try {
    const parsed = parseVideyInput(input)
    if (!parsed) {
      return {
        status: false,
        error: 'INVALID_VIDEY_URL'
      }
    }

    const head = await axios.head(parsed.directUrl, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5
    })

    const sizeBytes = parseInt(head.headers['content-length'] || 0, 10)
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)

    return {
      status: true,
      data: {
        id: parsed.id,
        url: parsed.directUrl,
        mime: head.headers['content-type'] || 'video/mp4',
        sizeMB,
        fetchedAt: new Date().toISOString()
      }
    }
  } catch (e) {
    return {
      status: false,
      error:
        e.response?.status === 404
          ? 'VIDEO_NOT_FOUND'
          : e.message
    }
  }
}

export default resolveVidey