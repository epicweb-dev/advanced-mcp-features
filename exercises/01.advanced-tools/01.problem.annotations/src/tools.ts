import { invariant } from '@epic-web/invariant'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
	createEntryInputSchema,
	createTagInputSchema,
	entryIdSchema,
	entryTagIdSchema,
	tagIdSchema,
	updateEntryInputSchema,
	updateTagInputSchema,
} from './db/schema.ts'
import { type EpicMeMCP } from './index.ts'
import { createWrappedVideo } from './video.ts'

// 🧝‍♀️ Because the tool annotations defaults and values are confusing, I'm giving
// this to you to help you use them correctly!
type ToolAnnotations = {
	// defaults to true, so only allow false
	openWorldHint?: false
} & (
	| {
			// when readOnlyHint is true, none of the other annotations can be changed
			readOnlyHint: true
	  }
	| {
			destructiveHint?: false // Only allow false (default is true)
			idempotentHint?: true // Only allow true (default is false)
	  }
)

export async function initializeTools(agent: EpicMeMCP) {
	agent.server.registerTool(
		'create_entry',
		{
			title: 'Create Entry',
			description: 'Create a new journal entry',
			// 🐨 add the appropriate annotations here for create_entry.
			// 💰 Is this destructive? Is it open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: createEntryInputSchema,
		},
		async (entry) => {
			const createdEntry = await agent.db.createEntry(entry)
			if (entry.tags) {
				for (const tagId of entry.tags) {
					await agent.db.addTagToEntry({
						entryId: createdEntry.id,
						tagId,
					})
				}
			}

			return {
				content: [
					createText(
						`Entry "${createdEntry.title}" created successfully with ID "${createdEntry.id}"`,
					),
					createEntryEmbeddedResource(createdEntry),
				],
			}
		},
	)

	agent.server.registerTool(
		'get_entry',
		{
			title: 'Get Entry',
			description: 'Get a journal entry by ID',
			// 🐨 add the appropriate annotations here for get_entry.
			// 💰 Is this read-only? Is it open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: entryIdSchema,
		},
		async ({ id }) => {
			const entry = await agent.db.getEntry(id)
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				content: [createEntryEmbeddedResource(entry)],
			}
		},
	)

	agent.server.registerTool(
		'list_entries',
		{
			title: 'List Entries',
			description: 'List all journal entries',
			// 🐨 add the appropriate annotations here for list_entries.
			// 💰 Is this read-only? Is it open world?
			annotations: {} satisfies ToolAnnotations,
		},
		async () => {
			const entries = await agent.db.getEntries()
			const entryLinks = entries.map(createEntryResourceLink)
			return {
				content: [
					createText(`Found ${entries.length} entries.`),
					...entryLinks,
				],
			}
		},
	)

	agent.server.registerTool(
		'update_entry',
		{
			title: 'Update Entry',
			description:
				'Update a journal entry. Fields that are not provided (or set to undefined) will not be updated. Fields that are set to null or any other value will be updated.',
			// 🐨 add the appropriate annotations here for update_entry.
			// 💰 Is this destructive? Idempotent? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: updateEntryInputSchema,
		},
		async ({ id, ...updates }) => {
			const existingEntry = await agent.db.getEntry(id)
			invariant(existingEntry, `Entry with ID "${id}" not found`)
			const updatedEntry = await agent.db.updateEntry(id, updates)
			return {
				content: [
					createText(
						`Entry "${updatedEntry.title}" (ID: ${id}) updated successfully`,
					),
					createEntryEmbeddedResource(updatedEntry),
				],
			}
		},
	)

	agent.server.registerTool(
		'delete_entry',
		{
			title: 'Delete Entry',
			description: 'Delete a journal entry',
			// 🐨 add the appropriate annotations here for delete_entry.
			// 💰 Is this idempotent? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: entryIdSchema,
		},
		async ({ id }) => {
			const existingEntry = await agent.db.getEntry(id)
			invariant(existingEntry, `Entry with ID "${id}" not found`)
			await agent.db.deleteEntry(id)

			return {
				content: [
					createText(
						`Entry "${existingEntry.title}" (ID: ${id}) deleted successfully`,
					),
					createEntryEmbeddedResource(existingEntry),
				],
			}
		},
	)

	agent.server.registerTool(
		'create_tag',
		{
			title: 'Create Tag',
			description: 'Create a new tag',
			// 🐨 add the appropriate annotations here for create_tag.
			// 💰 Is this destructive? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: createTagInputSchema,
		},
		async (tag) => {
			const createdTag = await agent.db.createTag(tag)
			return {
				content: [
					createText(
						`Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
					),
					createTagEmbeddedResource(createdTag),
				],
			}
		},
	)

	agent.server.registerTool(
		'get_tag',
		{
			title: 'Get Tag',
			description: 'Get a tag by ID',
			// 🐨 add the appropriate annotations here for get_tag.
			// 💰 Is this read-only? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: tagIdSchema,
		},
		async ({ id }) => {
			const tag = await agent.db.getTag(id)
			invariant(tag, `Tag ID "${id}" not found`)
			return {
				content: [createTagEmbeddedResource(tag)],
			}
		},
	)

	agent.server.registerTool(
		'list_tags',
		{
			title: 'List Tags',
			description: 'List all tags',
			// 🐨 add the appropriate annotations here for list_tags.
			// 💰 Is this read-only? Open world?
			annotations: {} satisfies ToolAnnotations,
		},
		async () => {
			const tags = await agent.db.getTags()
			const tagLinks = tags.map(createTagResourceLink)
			return {
				content: [createText(`Found ${tags.length} tags.`), ...tagLinks],
			}
		},
	)

	agent.server.registerTool(
		'update_tag',
		{
			title: 'Update Tag',
			description: 'Update a tag',
			// 🐨 add the appropriate annotations here for update_tag.
			// 💰 Is this destructive? Idempotent? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: updateTagInputSchema,
		},
		async ({ id, ...updates }) => {
			const updatedTag = await agent.db.updateTag(id, updates)
			return {
				content: [
					createText(
						`Tag "${updatedTag.name}" (ID: ${id}) updated successfully`,
					),
					createTagEmbeddedResource(updatedTag),
				],
			}
		},
	)

	agent.server.registerTool(
		'delete_tag',
		{
			title: 'Delete Tag',
			description: 'Delete a tag',
			// 🐨 add the appropriate annotations here for delete_tag.
			// 💰 Is this idempotent? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: tagIdSchema,
		},
		async ({ id }) => {
			const existingTag = await agent.db.getTag(id)
			invariant(existingTag, `Tag ID "${id}" not found`)
			await agent.db.deleteTag(id)
			return {
				content: [
					createText(
						`Tag "${existingTag.name}" (ID: ${id}) deleted successfully`,
					),
					createTagEmbeddedResource(existingTag),
				],
			}
		},
	)

	agent.server.registerTool(
		'add_tag_to_entry',
		{
			title: 'Add Tag to Entry',
			description: 'Add a tag to an entry',
			// 🐨 add the appropriate annotations here for add_tag_to_entry.
			// 💰 Is this destructive? Idempotent? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: entryTagIdSchema,
		},
		async ({ entryId, tagId }) => {
			const tag = await agent.db.getTag(tagId)
			const entry = await agent.db.getEntry(entryId)
			invariant(tag, `Tag ${tagId} not found`)
			invariant(entry, `Entry with ID "${entryId}" not found`)
			const entryTag = await agent.db.addTagToEntry({
				entryId,
				tagId,
			})
			return {
				content: [
					createText(
						`Tag "${tag.name}" (ID: ${entryTag.tagId}) added to entry "${entry.title}" (ID: ${entryTag.entryId}) successfully`,
					),
					createTagEmbeddedResource(tag),
					createEntryEmbeddedResource(entry),
				],
			}
		},
	)

	agent.server.registerTool(
		'create_wrapped_video',
		{
			title: 'Create Wrapped Video',
			description:
				'Create a "wrapped" video highlighting stats of your journaling this year',
			// 🐨 add the appropriate annotations here for create_wrapped_video.
			// 💰 Is this destructive? Open world?
			annotations: {} satisfies ToolAnnotations,
			inputSchema: {
				year: z
					.number()
					.default(new Date().getFullYear())
					.describe(
						'The year to create a wrapped video for (defaults to current year)',
					),
				mockTime: z
					.number()
					.optional()
					.describe(
						'If set to > 0, use mock mode and this is the mock wait time in milliseconds',
					),
			},
		},
		async ({ year = new Date().getFullYear(), mockTime }) => {
			const entries = await agent.db.getEntries()
			const filteredEntries = entries.filter(
				(entry) => new Date(entry.createdAt * 1000).getFullYear() === year,
			)
			const tags = await agent.db.getTags()
			const filteredTags = tags.filter(
				(tag) => new Date(tag.createdAt * 1000).getFullYear() === year,
			)
			const videoUri = await createWrappedVideo({
				entries: filteredEntries,
				tags: filteredTags,
				year,
				mockTime,
			})
			return {
				content: [
					createText('Video created successfully'),
					{
						type: 'resource_link',
						uri: videoUri,
						name: `wrapped-${year}.mp4`,
						description: `Wrapped Video for ${year}`,
						mimeType: 'video/mp4',
					},
				],
			}
		},
	)
}

function createText(text: unknown): CallToolResult['content'][number] {
	if (typeof text === 'string') {
		return { type: 'text', text }
	} else {
		return { type: 'text', text: JSON.stringify(text) }
	}
}

type ResourceLinkContent = Extract<
	CallToolResult['content'][number],
	{ type: 'resource_link' }
>

function createEntryResourceLink(entry: {
	id: number
	title: string
}): ResourceLinkContent {
	return {
		type: 'resource_link',
		uri: `epicme://entries/${entry.id}`,
		name: entry.title,
		description: `Journal Entry: "${entry.title}"`,
		mimeType: 'application/json',
	}
}

function createTagResourceLink(tag: {
	id: number
	name: string
}): ResourceLinkContent {
	return {
		type: 'resource_link',
		uri: `epicme://tags/${tag.id}`,
		name: tag.name,
		description: `Tag: "${tag.name}"`,
		mimeType: 'application/json',
	}
}

type ResourceContent = CallToolResult['content'][number]

function createEntryEmbeddedResource(entry: { id: number }): ResourceContent {
	return {
		type: 'resource',
		resource: {
			uri: `epicme://entries/${entry.id}`,
			mimeType: 'application/json',
			text: JSON.stringify(entry),
		},
	}
}

function createTagEmbeddedResource(tag: { id: number }): ResourceContent {
	return {
		type: 'resource',
		resource: {
			uri: `epicme://tags/${tag.id}`,
			mimeType: 'application/json',
			text: JSON.stringify(tag),
		},
	}
}
