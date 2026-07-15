import axios from "axios";
import { instagram } from "../lib/insta-scraper.js";

let handler = async (m, { text, usedPrefix, command }) => {
    try {
        const input = m.quoted ? m.quoted.text : text;
        const regex = /(https:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[a-zA-Z0-9_-]+)/;
        const parseUrl = input?.match(regex)?.[0];

        if (!parseUrl) {
            let cmd = usedPrefix + command;
            return m.reply(
                `*INSTAGRAM DOWNLOADER*\n\n` +
                `> *Cara Penggunaan:* ${cmd} [link]\n` +
                `> *Support:* Post, Reel, Carousel\n\n` +
                `*C O N T O H:*\n` +
                `> *• ${cmd}* https://www.instagram.com/p/xxxxx\n` +
                `> *• ${cmd}* https://www.instagram.com/reel/xxxxx`
            );
        }

        m.react('🔁');
        
        let result;
        try {
            result = await instagram.download(parseUrl, 10, 6000);
        } catch (e) {
            console.error('Error:', e.message);
            throw new Error('Gagal mengambil data dari Instagram.');
        }

        if (!result?.status) {
            throw new Error('Gagal mengambil data dari Instagram.');
        }

        const data = result.result;
        const isVideo = data.metadata?.isVideo || false;
        const isImage = data.metadata?.isImage || false;

        // Metadata caption
        let caption = `*INSTAGRAM DOWNLOADER*\n\n`;
        caption += `👤 *Username:* ${data.author?.username || 'N/A'}\n`;
        caption += `📝 *Caption:* ${data.metadata?.caption || 'Tidak ada caption'}\n`;
        caption += `📱 *Type:* ${isVideo ? '🎥 Video' : isImage ? '🖼️ Image' : 'Unknown'}\n`;
        caption += `❤️ *Likes:* ${formatNumber(data.metadata?.likeCount || 0)}\n`;
        caption += `💬 *Comments:* ${formatNumber(data.metadata?.commentCount || 0)}\n`;
        if (isVideo) {
            caption += `👁️ *Views:* ${formatNumber(data.metadata?.videoViewCount || 0)}\n`;
        }
        
        // Tampilkan jumlah slide jika carousel
        if (data.media?.slides && data.media.slides.length > 1) {
            caption += `📸 *Slides:* ${data.media.slides.length}\n`;
        }
        
        caption += `\n_Mengirim media..._`;

        await m.reply(caption);

        // Filter dan ambil URL media terbaik
        const downloadUrls = data.downloadUrls || {};
        
        // Ambil semua media dari slides
        let allImages = [];
        let allVideos = [];
        let thumbnail = downloadUrls.thumbnail || null;

        // Kumpulkan semua images dan videos dari slides
        if (data.media?.slides && data.media.slides.length > 0) {
            for (let slide of data.media.slides) {
                // Ambil images
                if (slide.images && slide.images.length > 0) {
                    // Filter image dengan resolusi terbaik (ambil yang paling besar)
                    let bestImage = slide.images.reduce((best, current) => {
                        const bestRes = parseInt(best.resolution?.split('x')[0] || 0);
                        const currentRes = parseInt(current.resolution?.split('x')[0] || 0);
                        return currentRes > bestRes ? current : best;
                    }, slide.images[0]);
                    
                    allImages.push(bestImage);
                }
                
                // Ambil videos
                if (slide.videos && slide.videos.length > 0) {
                    // Filter video dengan resolusi terbaik
                    let bestVideo = slide.videos.reduce((best, current) => {
                        const bestRes = parseInt(best.resolution?.split('x')[0] || 0);
                        const currentRes = parseInt(current.resolution?.split('x')[0] || 0);
                        return currentRes > bestRes ? current : best;
                    }, slide.videos[0]);
                    
                    allVideos.push(bestVideo);
                }
            }
        }

        // Jika tidak ada slides, coba dari downloadUrls
        if (allImages.length === 0 && downloadUrls.images) {
            allImages = downloadUrls.images;
        }
        
        if (allVideos.length === 0 && downloadUrls.videos) {
            allVideos = downloadUrls.videos;
        }

        // Kirim media
        if (isVideo && allVideos.length > 0) {
            // Kirim semua video
            for (let video of allVideos) {
                try {
                    const buffer = await getBuffer(video.url);
                    await conn.sendFile(m.chat, buffer, `${data.metadata.code}_video.mp4`, '', m);
                } catch (e) {
                    console.error('Error sending video:', e.message);
                }
            }
        } 
        else if (isImage && allImages.length > 0) {
            if (allImages.length === 1) {
                // Single image - ambil resolusi terbaik
                try {
                    const bestImage = allImages[0];
                    const buffer = await getBuffer(bestImage.url);
                    await conn.sendMessage(m.chat, { image: buffer, fileName: `${data.metadata.code}.jpg` }, { quoted: m });
                } catch (e) {
                    console.error('Error sending image:', e.message);
                }
            } else {
                // Multiple images (album/carousel)
                try {
                    let media = [];
                    for (let img of allImages) {
                        try {
                            const buffer = await getBuffer(img.url);
                            media.push({ image: buffer });
                        } catch (e) {
                            console.error('Error getting image:', e.message);
                        }
                    }
                    if (media.length > 0) {
                        await conn.sendAlbumMessage(m.chat, media, { quoted: m });
                    }
                } catch (e) {
                    console.error('Error sending album:', e.message);
                    // Fallback: kirim satu per satu
                    for (let img of allImages) {
                        try {
                            const buffer = await getBuffer(img.url);
                            await conn.sendFile(m.chat, buffer, `${data.metadata.code}_slide.jpg`, '', m);
                        } catch (e) {
                            console.error('Error sending image:', e.message);
                        }
                    }
                }
            }
        }
        // Jika ada thumbnail
        else if (thumbnail) {
            try {
                const buffer = await getBuffer(thumbnail);
                await conn.sendFile(m.chat, buffer, `${data.metadata.code}_thumb.jpg`, '', m);
            } catch (e) {
                console.error('Error sending thumbnail:', e.message);
            }
        } else {
            await m.reply('⚠️ Tidak ada media yang dapat dikirim.');
        }

    } catch (err) {
        console.error('Error:', err);
        return m.reply('❌ Terjadi kesalahan saat memproses permintaan\n\n' + err.message);
    }
};

handler.help = ['instagram'];
handler.tags = ['downloader'];
handler.command = /^(ig|igdl|instagram|instagramdl)$/i;
handler.limit = true;

export default handler;

// Utility Functions
function formatNumber(number) {
    if (!number) return '0';
    return number.toLocaleString('id-ID');
}

async function getBuffer(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; 25028RN03A) AppleWebKit/537.36',
                'Referer': 'https://www.instagram.com/',
            },
            timeout: 60000,
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error fetching buffer:', error.message);
        throw error;
    }
}