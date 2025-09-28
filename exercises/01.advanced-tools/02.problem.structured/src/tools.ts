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
	// 💰 you'll need these:
	// entryTagSchema,
	// entryWithTagsSchema,
	// tagSchema,
} from './db/schema.ts'
import { type EpicMeMCP } from './index.ts'
import { createWrappedVideo } from './video.ts'

export async function initializeTools(agent: EpicMeMCP) {
	agent.server.registerTool(
		'create_entry',
		{
			title: 'Create Entry',
			description: 'Create a new journal entry',
			annotations: {
				destructiveHint: false,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: createEntryInputSchema,
			// 🐨 add an outputSchema here with an entry that is an entryWithTagsSchema
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

			// 🐨 refetch entry to get updated tags
			// 💰 agent.db.getEntry(createdEntry.id)
			// 💯 add invariant to check if the entry was found

			// 🐨 create a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Entry "${createdEntry.title}" created successfully with ID "${createdEntry.id}"`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					// 💰 createEntryResourceLink(createdEntry),
					createEntryEmbeddedResource(createdEntry),

					// 🐨 add the structuredContent as a text block
					// 💰 createText(structuredContent),
				],
			}
		},
	)

	agent.server.registerTool(
		'get_entry',
		{
			title: 'Get Entry',
			description: 'Get a journal entry by ID',
			annotations: {
				readOnlyHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: entryIdSchema,
			// 🐨 add an outputSchema here with an entry that is an entrySchema
		},
		async ({ id }) => {
			const entry = await agent.db.getEntry(id)
			invariant(entry, `Entry with ID "${id}" not found`)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					// 🐨 reduce duplication by switching this to a resource link
					createEntryEmbeddedResource(entry),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'list_entries',
		{
			title: 'List Entries',
			description: 'List all journal entries',
			annotations: {
				readOnlyHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			// 🐨 add an outputSchema here with entries that is an array of entrySchema
		},
		async () => {
			const entries = await agent.db.getEntries()
			const entryLinks = entries.map(createEntryResourceLink)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(`Found ${entries.length} entries.`),
					...entryLinks,
					// 🐨 add the structuredContent as a text block
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
			annotations: {
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: updateEntryInputSchema,
			// 🐨 add an outputSchema here with an entry that is an entryWithTagsSchema
		},
		async ({ id, ...updates }) => {
			const existingEntry = await agent.db.getEntry(id)
			invariant(existingEntry, `Entry with ID "${id}" not found`)
			const updatedEntry = await agent.db.updateEntry(id, updates)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Entry "${updatedEntry.title}" (ID: ${id}) updated successfully`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createEntryEmbeddedResource(updatedEntry),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'delete_entry',
		{
			title: 'Delete Entry',
			description: 'Delete a journal entry',
			annotations: {
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: entryIdSchema,
			// 🐨 add an outputSchema here with success (boolean) and entry (entryWithTagsSchema)
		},
		async ({ id }) => {
			const existingEntry = await agent.db.getEntry(id)
			invariant(existingEntry, `Entry with ID "${id}" not found`)
			await agent.db.deleteEntry(id)

			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Entry "${existingEntry.title}" (ID: ${id}) deleted successfully`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createEntryEmbeddedResource(existingEntry),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'create_tag',
		{
			title: 'Create Tag',
			description: 'Create a new tag',
			annotations: {
				destructiveHint: false,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: createTagInputSchema,
			// 🐨 add an outputSchema here with a tag that is a tagSchema
		},
		async (tag) => {
			const createdTag = await agent.db.createTag(tag)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createTagEmbeddedResource(createdTag),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'get_tag',
		{
			title: 'Get Tag',
			description: 'Get a tag by ID',
			annotations: {
				readOnlyHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: tagIdSchema,
			// 🐨 add an outputSchema here with a tag that is a tagSchema
		},
		async ({ id }) => {
			const tag = await agent.db.getTag(id)
			invariant(tag, `Tag ID "${id}" not found`)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(tag),
					// 🐨 reduce duplication by switching this to a resource link
					createTagEmbeddedResource(tag),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'list_tags',
		{
			title: 'List Tags',
			description: 'List all tags',
			annotations: {
				readOnlyHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			// 🐨 add an outputSchema here with tags that is an array of tagSchema
		},
		async () => {
			const tags = await agent.db.getTags()
			const tagLinks = tags.map(createTagResourceLink)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(`Found ${tags.length} tags.`),
					...tagLinks,
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'update_tag',
		{
			title: 'Update Tag',
			description: 'Update a tag',
			annotations: {
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: updateTagInputSchema,
			// 🐨 add an outputSchema here with a tag that is a tagSchema
		},
		async ({ id, ...updates }) => {
			const updatedTag = await agent.db.updateTag(id, updates)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Tag "${updatedTag.name}" (ID: ${id}) updated successfully`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createTagEmbeddedResource(updatedTag),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'delete_tag',
		{
			title: 'Delete Tag',
			description: 'Delete a tag',
			annotations: {
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: tagIdSchema,
			// 🐨 add an outputSchema here with success (boolean) and tag (tagSchema)
		},
		async ({ id }) => {
			const existingTag = await agent.db.getTag(id)
			invariant(existingTag, `Tag ID "${id}" not found`)
			await agent.db.deleteTag(id)
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Tag "${existingTag.name}" (ID: ${id}) deleted successfully`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createTagEmbeddedResource(existingTag),
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)

	agent.server.registerTool(
		'add_tag_to_entry',
		{
			title: 'Add Tag to Entry',
			description: 'Add a tag to an entry',
			annotations: {
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			} satisfies ToolAnnotations,
			inputSchema: entryTagIdSchema,
			// 🐨 add an outputSchema here with a success boolean and an entryTag that is an entryTagSchema
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
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText(
						`Tag "${tag.name}" (ID: ${entryTag.tagId}) added to entry "${entry.title}" (ID: ${entryTag.entryId}) successfully`,
					),
					// 🐨 reduce duplication by switching this to a resource link
					createTagEmbeddedResource(tag),
					// 🐨 reduce duplication by switching this to a resource link
					createEntryEmbeddedResource(entry),
					// 🐨 add the structuredContent as a text block
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
			annotations: {
				destructiveHint: false,
				openWorldHint: false,
			} satisfies ToolAnnotations,
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
			// 🐨 add an outputSchema here with a videoUri field (you're on your own here!)
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
			// 🐨 add a structuredContent here that matches the outputSchema
			return {
				// 🐨 add structuredContent here
				content: [
					createText('Video created successfully'),
					// 🦉 keep the resource link here. Even though the structuredContent
					// has the URI, clients may not look for it and instead look for resource links
					{
						type: 'resource_link',
						uri: videoUri,
						name: `wrapped-${year}.mp4`,
						description: `Wrapped Video for ${year}`,
						mimeType: 'video/mp4',
					},
					// 🐨 add the structuredContent as a text block
				],
			}
		},
	)
}

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

// 💣 we now use structuredContent to return the contents of the resources with
// resource links to share the URIs. Feel free to delete the embedded resource
// utilities below.
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
