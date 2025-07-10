import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { userInfo } from 'node:os'

const subscribers = new Set<() => void>()

export async function listVideos() {
	const videos = await fs.readdir('./videos').catch(() => [])
	return videos
}

export async function getVideoBase64(videoId: string) {
	let video: Buffer
	try {
		video = await fs.readFile(`./videos/${videoId}`)
	} catch (err: any) {
		if (err.code === 'ENOENT') {
			throw new Error(`Video with ID "${videoId}" not found.`)
		}
		throw err
	}
	return video.toString('base64')
}

export function subscribe(subscriber: () => void) {
	subscribers.add(subscriber)
	return () => {
		subscribers.delete(subscriber)
	}
}

function notifySubscribers() {
	for (const subscriber of subscribers) {
		subscriber()
	}
}

export async function createWrappedVideo({
	entries,
	tags,
	year,
	mockTime,
	onProgress,
}: {
	entries: Array<{ id: number; content: string; title: string }>
	tags: Array<{ id: number; name: string }>
	year: number
	mockTime?: number
	onProgress?: (progress: number) => void
}) {
	const videoFilename = `wrapped-${year}.mp4`

	if (mockTime && mockTime > 0) {
		const step = mockTime / 10
		for (let i = 0; i < mockTime; i += step) {
			const progress = i / mockTime
			if (progress >= 1) break
			onProgress?.(progress)
			await new Promise((resolve) => setTimeout(resolve, step))
		}
		onProgress?.(1)
		return `epicme://videos/${videoFilename}`
	}

	const longestEntry = entries.reduce((longest, entry) => {
		return entry.content.length > (longest?.content.length ?? 0)
			? entry
			: longest
	}, entries[0])
	const shortestEntry = entries.reduce((shortest, entry) => {
		return entry.content.length < (shortest?.content.length ?? 0)
			? entry
			: shortest
	}, entries[0])
	const totalDurationSeconds = 60
	const texts = [
		{
			text: `Hello ${userInfo().username}!`,
			color: '#FF1493',
			fontsize: 72,
		},
		{
			text: `It is ${new Date().toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			})}`,
			color: '#33FF99',
			fontsize: 72,
		},
		{
			text: `Here is your EpicMe wrapped video for ${year}`,
			color: '#66CCFF',
			fontsize: 72,
		},
		{
			text: `You wrote ${entries.length} entries in ${year}`,
			color: '#ff69b4',
			fontsize: 72,
		},
		longestEntry
			? {
					text: `Your longest entry was ${longestEntry?.content.length} characters\n"${longestEntry?.title}" `,
					color: '#FF0000',
					fontsize: 72,
				}
			: null,
		shortestEntry
			? {
					text: `Your shortest entry was ${shortestEntry?.content.length} characters\n"${shortestEntry?.title}" `,
					color: '#B39DDB',
					fontsize: 72,
				}
			: null,
		entries.length < 1
			? {
					text: `You did not write any entries in ${year}`,
					color: '#D2B48C',
					fontsize: 72,
				}
			: null,
		tags.length > 0
			? {
					text: `And you created ${tags.length} tags in ${year}`,
					color: '#FFB300',
					fontsize: 72,
				}
			: {
					text: `You did not create any tags in ${year}`,
					color: '#D2B48C',
					fontsize: 72,
				},
		{ text: `Good job!`, color: 'red', fontsize: 72 },
		{
			text: `Keep Journaling in ${year + 1}!`,
			color: '#ffa500',
			fontsize: 72,
		},
	].filter(Boolean)

	const outputFile = `./videos/${videoFilename}`
	await fs.mkdir('./videos', { recursive: true })
	const fontPath = './other/caveat-variable-font.ttf'

	const numTexts = texts.length
	const perTextDuration = totalDurationSeconds / numTexts
	const timings = texts.map((_, i) => {
		const start = perTextDuration * i
		const end = perTextDuration * (i + 1)
		return { start, end }
	})

	const drawtexts = texts.map((t, i) => {
		const { start, end } = timings[i]!
		const fadeInEnd = start + perTextDuration / 3
		const fadeOutStart = end - perTextDuration / 3
		const scrollExpr = `h-((t-${start})*(h+text_h)/${perTextDuration})`
		const fontcolor = t.color.startsWith('#')
			? t.color.replace('#', '0x')
			: t.color
		// Properly handle newlines for ffmpeg drawtext: replace \n with actual newline escape and split into multiple drawtext filters if needed
		const lines = t.text.split('\n')
		const drawtextFilters = lines.map((line, lineIdx) => {
			const safeLine = line.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")
			const yOffset = lineIdx * (t.fontsize + 12) // 10px line spacing
			return `drawtext=fontfile=${fontPath}:text='${safeLine}':fontcolor=${fontcolor}:fontsize=${t.fontsize}:x=(w-text_w)/2:y=${scrollExpr}+${yOffset}:alpha='if(lt(t,${start}),0,if(lt(t,${fadeInEnd}),1,if(lt(t,${fadeOutStart}),1,if(lt(t,${end}),((${end}-t)/${perTextDuration / 3}),0))))':shadowcolor=black:shadowx=4:shadowy=4`
		})
		return drawtextFilters.join(',')
	})

	let ffmpeg: ReturnType<typeof spawn> | undefined
	const ffmpegPromise = new Promise((resolve, reject) => {
		ffmpeg = spawn('ffmpeg', [
			'-f',
			'lavfi',
			'-i',
			`color=c=black:s=1280x720:d=${totalDurationSeconds}`,
			'-vf',
			drawtexts.join(','),
			'-c:v',
			'libx264',
			'-preset',
			'veryslow', // better compression
			'-crf',
			'32', // higher CRF = smaller file, lower quality
			'-pix_fmt',
			'yuv420p',
			'-y',
			outputFile,
		])

		if (ffmpeg.stderr) {
			ffmpeg.stderr.on('data', (data) => {
				const str = data.toString()
				const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
				if (timeMatch) {
					const hours = Number(timeMatch[1])
					const minutes = Number(timeMatch[2])
					const seconds = Number(timeMatch[3])
					const fraction = Number(timeMatch[4])
					const currentSeconds =
						hours * 3600 + minutes * 60 + seconds + fraction / 100
					const progress = Math.min(currentSeconds / totalDurationSeconds, 1)
					onProgress?.(progress)
				}
			})
		}

		ffmpeg.on('close', (code) => {
			if (code === 0) {
				onProgress?.(1)
				resolve(outputFile)
			} else {
				reject(new Error(`ffmpeg exited with code ${code}`))
			}
		})
	})

	await ffmpegPromise

	notifySubscribers()

	const videoUri = `epicme://videos/${videoFilename}`
	return videoUri
}
