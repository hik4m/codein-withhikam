import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { EventSource } from 'eventsource'
import FormData from 'form-data'
import https from 'https'

const BASE_URL = 'https://prithivmlmods-qwen-image-edit-2509-loras-fast.hf.space'
const API_PREFIX = '/gradio_api'
const TMP_DIR = './tmp/qwenimg'

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
}

export class QwenImageEditScraper {
    constructor() {
        this.sessionHash = this._genSession()
        this.axios = axios.create({
            baseURL: BASE_URL,
            httpsAgent: new https.Agent({
                keepAlive: true,
                rejectUnauthorized: false
            }),
            headers: {
                'User-Agent': 'Mozilla/5.0',
                Origin: BASE_URL,
                Referer: `${BASE_URL}/`
            }
        })
    }

    _genSession(len = 11) {
        const c = 'hy'
        return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join('')
    }

    _tmpFile(ext = 'jpg') {
        return path.join(
            TMP_DIR,
            `qwen_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        )
    }

    async _bufferToFile(buffer) {
        const file = this._tmpFile('jpg')
        fs.writeFileSync(file, buffer)
        return file
    }

    async _downloadUrl(url) {
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        return this._bufferToFile(res.data)
    }

    async uploadImage(input) {
        let filePath

        if (Buffer.isBuffer(input)) {
            filePath = await this._bufferToFile(input)
        } else if (typeof input === 'string') {
            if (input.startsWith('http')) {
                filePath = await this._downloadUrl(input)
            } else {
                filePath = input
            }
        } else {
            throw new Error('INVALID_IMAGE_SOURCE')
        }

        if (!fs.existsSync(filePath)) {
            throw new Error('IMAGE_FILE_NOT_FOUND')
        }

        const form = new FormData()
        form.append('files', fs.createReadStream(filePath), {
            filename: path.basename(filePath),
            contentType: 'image/jpeg'
        })

        const uploadId = Math.random().toString(36).slice(2, 12)
        const res = await this.axios.post(
            `${API_PREFIX}/upload?upload_id=${uploadId}`,
            form,
            { headers: form.getHeaders() }
        )

        await this._waitUpload(uploadId)

        return {
            path: res.data[0],
            url: `${BASE_URL}${API_PREFIX}/file=${res.data[0]}`,
            meta: { _type: 'gradio.FileData' },
            cleanup: () => {
                if (filePath && filePath.startsWith(TMP_DIR) && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
            }
        }
    }

    async _waitUpload(uploadId) {
        return new Promise((resolve, reject) => {
            const es = new EventSource(
                `${BASE_URL}${API_PREFIX}/upload_progress?upload_id=${uploadId}`
            )

            es.onmessage = e => {
                const d = JSON.parse(e.data)
                if (d.msg === 'done') {
                    es.close()
                    resolve()
                }
            }

            es.onerror = () => {
                es.close()
                resolve()
            }

            setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), 30000)
        })
    }

   async editImage({ imageSource, prompt }, attempt = 1) {
    if (!prompt) throw new Error('PROMPT_REQUIRED')

    const file = await this.uploadImage(imageSource)
    const core = Buffer.from('cnl1aGFu').toString('utf8')

    const payload = {
        data: [
            file,
            String(prompt),
            'Edit-Skin',
            0,
            true,
            1.0,
            4,
            core
        ],
        fn_index: 1,
        trigger_id: 8,
        session_hash: this.sessionHash
    }

    try {
        const res = await this.axios.post(
            `${API_PREFIX}/queue/join`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        )

        return await this._waitResult(res.data.event_id)

    } catch (err) {
        if (err.message === 'NO_OUTPUT' && attempt < 3) {
            this.sessionHash = this._genSession()
            return this.editImage({ imageSource, prompt }, attempt + 1)
        }
        throw err
    } finally {
        file.cleanup()
    }
}

    async _waitResult(eventId) {
        return new Promise((resolve, reject) => {
            const es = new EventSource(
                `${BASE_URL}${API_PREFIX}/queue/data?session_hash=${this.sessionHash}&event_id=${eventId}`
            )

            es.onmessage = e => {
                const d = JSON.parse(e.data)
                if (d.msg === 'process_completed') {
                    es.close()
                    const out = d.output?.data?.[0]
if (!out) {
    es.close()
    return reject(new Error('NO_OUTPUT'))
}

                    resolve({
                        imageUrl: out.url || `${BASE_URL}${API_PREFIX}/file=${out.path}`,
                        meta: out
                    })
                }
            }

            es.onerror = () => {
                es.close()
                reject(new Error('RESULT_ERROR'))
            }
        })
    }
}