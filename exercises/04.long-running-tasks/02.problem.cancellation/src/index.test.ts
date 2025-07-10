import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
	CreateMessageRequestSchema,
	type CreateMessageResult,
	ElicitRequestSchema,
	ProgressNotificationSchema,
	PromptListChangedNotificationSchema,
	ResourceListChangedNotificationSchema,
	ResourceUpdatedNotificationSchema,
	ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { test, expect } from 'vitest'
import { type z } from 'zod'

function getTestDbPath() {
	return `./test.ignored/db.${process.env.VITEST_WORKER_ID}.${Math.random().toString(36).slice(2)}.sqlite`
}

async function setupClient({ capabilities = {} } = {}) {
	const EPIC_ME_DB_PATH = getTestDbPath()
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	const client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{ capabilities },
	)
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
		stderr: 'ignore',
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
	})
	await client.connect(transport)
	return {
		client,
		EPIC_ME_DB_PATH,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {})
		},
	}
}

test('Tool Definition', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool, '🚨 firstTool should be a create_entry tool').toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^create_entry$/i),
			description: expect.stringMatching(/^create a new journal entry$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					title: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/title/i),
					}),
					content: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/content/i),
					}),
				}),
			}),
		}),
	)
})

test('Tool annotations and structured output', async () => {
	await using setup = await setupClient()
	const { client } = setup

	// Check create_entry and create_tag annotations (always enabled)
	let list = await client.listTools()
	let toolMap = Object.fromEntries(list.tools.map((t) => [t.name, t]))

	// Check create_entry annotations
	const createEntryTool = toolMap['create_entry']
	invariant(createEntryTool, '🚨 create_entry tool not found')
	expect(
		createEntryTool.annotations,
		'🚨 create_entry missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			openWorldHint: false,
		}),
	)

	// Check create_tag annotations
	const createTagTool = toolMap['create_tag']
	invariant(createTagTool, '🚨 create_tag tool not found')
	expect(
		createTagTool.annotations,
		'🚨 create_tag missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			openWorldHint: false,
		}),
	)

	// Create a tag and entry for further tool calls
	const tagResult = await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'TestTag',
			description: 'A tag for testing',
		},
	})
	expect(
		tagResult.structuredContent,
		'🚨 tagResult.structuredContent should be defined',
	).toBeDefined()
	const tag = (tagResult.structuredContent as any).tag
	invariant(tag, '🚨 No tag resource found')
	invariant(tag.id, '🚨 No tag ID found')

	const entryResult = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})
	expect(
		entryResult.structuredContent,
		'🚨 entryResult.structuredContent should be defined',
	).toBeDefined()
	const entry = (entryResult.structuredContent as any).entry
	invariant(entry, '🚨 No entry resource found')
	invariant(entry.id, '🚨 No entry ID found')

	// List tools again now that entry and tag exist
	list = await client.listTools()
	toolMap = Object.fromEntries(list.tools.map((t) => [t.name, t]))

	// Check delete_entry annotations
	const deleteEntryTool = toolMap['delete_entry']
	invariant(deleteEntryTool, '🚨 delete_entry tool not found')
	expect(
		deleteEntryTool.annotations,
		'🚨 delete_entry missing annotations',
	).toEqual(
		expect.objectContaining({
			idempotentHint: true,
			openWorldHint: false,
		}),
	)

	// Check delete_tag annotations
	const deleteTagTool = toolMap['delete_tag']
	invariant(deleteTagTool, '🚨 delete_tag tool not found')
	expect(
		deleteTagTool.annotations,
		'🚨 delete_tag missing annotations',
	).toEqual(
		expect.objectContaining({
			idempotentHint: true,
			openWorldHint: false,
		}),
	)

	// get_entry structuredContent
	const getEntryResult = await client.callTool({
		name: 'get_entry',
		arguments: { id: entry.id },
	})
	const getEntryContent = (getEntryResult.structuredContent as any).entry
	invariant(getEntryContent, '🚨 get_entry missing entry in structuredContent')
	expect(getEntryContent.id, '🚨 get_entry structuredContent.id mismatch').toBe(
		entry.id,
	)

	// get_tag structuredContent
	const getTagResult = await client.callTool({
		name: 'get_tag',
		arguments: { id: tag.id },
	})
	const getTagContent = (getTagResult.structuredContent as any).tag
	invariant(getTagContent, '🚨 get_tag missing tag in structuredContent')
	expect(getTagContent.id, '🚨 get_tag structuredContent.id mismatch').toBe(
		tag.id,
	)

	// update_entry structuredContent
	const updateEntryResult = await client.callTool({
		name: 'update_entry',
		arguments: { id: entry.id, title: 'Updated Entry' },
	})
	const updateEntryContent = (updateEntryResult.structuredContent as any).entry
	invariant(
		updateEntryContent,
		'🚨 update_entry missing entry in structuredContent',
	)
	expect(
		updateEntryContent.title,
		'🚨 update_entry structuredContent.title mismatch',
	).toBe('Updated Entry')

	// update_tag structuredContent
	const updateTagResult = await client.callTool({
		name: 'update_tag',
		arguments: { id: tag.id, name: 'UpdatedTag' },
	})
	const updateTagContent = (updateTagResult.structuredContent as any).tag
	invariant(updateTagContent, '🚨 update_tag missing tag in structuredContent')
	expect(
		updateTagContent.name,
		'🚨 update_tag structuredContent.name mismatch',
	).toBe('UpdatedTag')

	// delete_entry structuredContent
	const deleteEntryResult = await client.callTool({
		name: 'delete_entry',
		arguments: { id: entry.id },
	})
	const deleteEntryContent = deleteEntryResult.structuredContent as any
	invariant(deleteEntryContent, '🚨 delete_entry missing structuredContent')
	expect(
		deleteEntryContent.success,
		'🚨 delete_entry structuredContent.success should be true',
	).toBe(true)
	expect(
		deleteEntryContent.entry.id,
		'🚨 delete_entry structuredContent.entry.id mismatch',
	).toBe(entry.id)

	// delete_tag structuredContent
	const deleteTagResult = await client.callTool({
		name: 'delete_tag',
		arguments: { id: tag.id },
	})
	const deleteTagContent = deleteTagResult.structuredContent as any
	invariant(deleteTagContent, '🚨 delete_tag missing structuredContent')
	expect(
		deleteTagContent.success,
		'🚨 delete_tag structuredContent.success should be true',
	).toBe(true)
	expect(
		deleteTagContent.tag.id,
		'🚨 delete_tag structuredContent.tag.id mismatch',
	).toBe(tag.id)
})

test('ListChanged notification: resources', async () => {
	await using setup = await setupClient()
	const { client } = setup

	const resourceListChanged = await deferred<any>()
	client.setNotificationHandler(
		ResourceListChangedNotificationSchema,
		(notification) => {
			resourceListChanged.resolve(notification)
		},
	)

	// Trigger a DB change that should enable resources
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: faker.lorem.word(),
			description: faker.lorem.sentence(),
		},
	})
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: faker.lorem.words(3),
			content: faker.lorem.paragraphs(2),
		},
	})

	let resourceNotif
	try {
		resourceNotif = await Promise.race([
			resourceListChanged.promise,
			AbortSignal.timeout(2000),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive resources/listChanged notification when expected. Make sure your server calls sendResourceListChanged when resources change.',
		)
	}
	expect(
		resourceNotif,
		'🚨 Did not receive resources/listChanged notification when expected. Make sure your server calls sendResourceListChanged when resources change.',
	).toBeDefined()
})

test('ListChanged notification: tools', async () => {
	await using setup = await setupClient()
	const { client } = setup

	const toolListChanged = await deferred<any>()
	client.setNotificationHandler(
		ToolListChangedNotificationSchema,
		(notification) => {
			toolListChanged.resolve(notification)
		},
	)

	// Trigger a DB change that should enable tools
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: faker.lorem.word(),
			description: faker.lorem.sentence(),
		},
	})
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: faker.lorem.words(3),
			content: faker.lorem.paragraphs(2),
		},
	})

	let toolNotif
	try {
		toolNotif = await Promise.race([
			toolListChanged.promise,
			AbortSignal.timeout(2000),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive tools/listChanged notification when expected. Make sure your server notifies clients when tools are enabled/disabled.',
		)
	}
	expect(
		toolNotif,
		'🚨 Did not receive tools/listChanged notification when expected. Make sure your server notifies clients when tools are enabled/disabled.',
	).toBeDefined()
})

test('ListChanged notification: prompts', async () => {
	await using setup = await setupClient()
	const { client } = setup

	const promptListChanged = await deferred<any>()
	client.setNotificationHandler(
		PromptListChangedNotificationSchema,
		(notification) => {
			promptListChanged.resolve(notification)
		},
	)

	// Trigger a DB change that should enable prompts
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: faker.lorem.word(),
			description: faker.lorem.sentence(),
		},
	})
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: faker.lorem.words(3),
			content: faker.lorem.paragraphs(2),
		},
	})

	let promptNotif
	try {
		promptNotif = await Promise.race([
			promptListChanged.promise,
			AbortSignal.timeout(2000),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive prompts/listChanged notification when expected. Make sure your server notifies clients when prompts are enabled/disabled.',
		)
	}
	expect(
		promptNotif,
		'🚨 Did not receive prompts/listChanged notification when expected. Make sure your server notifies clients when prompts are enabled/disabled.',
	).toBeDefined()
})

async function deferred<ResolvedValue>() {
	const ref = {} as {
		promise: Promise<ResolvedValue>
		resolve: (value: ResolvedValue) => void
		reject: (reason?: any) => void
		value: ResolvedValue | undefined
		reason: any | undefined
	}
	ref.promise = new Promise<ResolvedValue>((resolve, reject) => {
		ref.resolve = (value) => {
			ref.value = value
			resolve(value)
		}
		ref.reject = (reason) => {
			ref.reason = reason
			reject(reason)
		}
	})

	return ref
}
