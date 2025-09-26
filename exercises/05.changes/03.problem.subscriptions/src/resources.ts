import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'
import {
	getVideoBase64,
	listVideos,
	subscribe as subscribeToVideoChanges,
} from './video.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.db.subscribe(() => agent.server.sendResourceListChanged())
	subscribeToVideoChanges(() => agent.server.sendResourceListChanged())

	const tagListResource = agent.server.registerResource(
		'tags',
		'epicme://tags',
		{
			title: 'Tags',
			description: 'All tags currently in the database',
		},
		async (uri) => {
			const tags = await agent.db.getTags()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tags),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	const tagsResource = agent.server.registerResource(
		'tag',
		new ResourceTemplate('epicme://tags/{id}', {
			complete: {
				async id(value) {
					const tags = await agent.db.getTags()
					return tags
						.map((tag) => tag.id.toString())
						.filter((id) => id.includes(value))
				},
			},
			list: async () => {
				const tags = await agent.db.getTags()
				return {
					resources: tags.map((tag) => ({
						name: tag.name,
						uri: `epicme://tags/${tag.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{
			title: 'Tag',
			description: 'A single tag with the given ID',
		},
		async (uri, { id }) => {
			const tag = await agent.db.getTag(Number(id))
			invariant(tag, `Tag with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tag),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	const entryResource = agent.server.registerResource(
		'entry',
		new ResourceTemplate('epicme://entries/{id}', {
			list: undefined,
			complete: {
				async id(value) {
					const entries = await agent.db.getEntries()
					return entries
						.map((entry) => entry.id.toString())
						.filter((id) => id.includes(value))
				},
			},
		}),
		{
			title: 'Journal Entry',
			description: 'A single journal entry with the given ID',
		},
		async (uri, { id }) => {
			const entry = await agent.db.getEntry(Number(id))
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(entry),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	const videoResource = agent.server.registerResource(
		'video',
		new ResourceTemplate('epicme://videos/{videoId}', {
			complete: {
				async videoId(value) {
					const videos = await listVideos()
					return videos.filter((video) => video.includes(value))
				},
			},
			list: async () => {
				const videos = await listVideos()
				return {
					resources: videos.map((video) => ({
						name: video,
						uri: `epicme://videos/${video}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{
			title: 'EpicMe Videos',
			description: 'A single video with the given ID',
		},
		async (uri, { videoId }) => {
			invariant(typeof videoId === 'string', 'Video ID is required')

			const videoBase64 = await getVideoBase64(videoId)
			invariant(videoBase64, `Video with ID "${videoId}" not found`)
			return {
				contents: [
					{
						mimeType: 'video/mp4',
						text: videoBase64,
						uri: uri.toString(),
					},
				],
			}
		},
	)

	async function updateResources() {
		const entries = await agent.db.getEntries()
		const tags = await agent.db.getTags()
		const videos = await listVideos()

		if (tags.length > 0) {
			if (!tagListResource.enabled) tagListResource.enable()
			if (!tagsResource.enabled) tagsResource.enable()
		} else {
			if (tagListResource.enabled) tagListResource.disable()
			if (tagsResource.enabled) tagsResource.disable()
		}

		if (entries.length > 0) {
			if (!entryResource.enabled) entryResource.enable()
		} else {
			if (entryResource.enabled) entryResource.disable()
		}

		if (videos.length > 0) {
			if (!videoResource.enabled) videoResource.enable()
		} else {
			if (videoResource.enabled) videoResource.disable()
		}
	}

	agent.db.subscribe(updateResources)
	await updateResources()
}
