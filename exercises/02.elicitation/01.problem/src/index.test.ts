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
