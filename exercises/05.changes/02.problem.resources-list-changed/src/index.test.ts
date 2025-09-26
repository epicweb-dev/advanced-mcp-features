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
			// give things a moment to release locks and whatnot
			await new Promise((r) => setTimeout(r, 100))
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {}) // ignore missing file
		},
	}
}

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

	// Check create_entry outputSchema
	expect(
		createEntryTool.outputSchema,
		'🚨 create_entry missing outputSchema',
	).toBeDefined()

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

	// Check create_tag outputSchema
	expect(
		createTagTool.outputSchema,
		'🚨 create_tag missing outputSchema',
	).toBeDefined()

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

	// Test structured content in basic CRUD operations
	const getEntryResult = await client.callTool({
		name: 'get_entry',
		arguments: { id: entry.id },
	})
	const getEntryContent = (getEntryResult.structuredContent as any).entry
	invariant(getEntryContent, '🚨 get_entry missing entry in structuredContent')
	expect(getEntryContent.id, '🚨 get_entry structuredContent.id mismatch').toBe(
		entry.id,
	)
})

test('Elicitation: delete_tag decline', async () => {
	await using setup = await setupClient({ capabilities: { elicitation: {} } })
	const { client } = setup

	// Set up a handler for elicitation requests
	client.setRequestHandler(ElicitRequestSchema, () => {
		return {
			action: 'decline',
		}
	})

	// Create a tag to delete
	const tagResult = await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'Elicit Test Tag',
			description: 'Testing elicitation decline.',
		},
	})
	const tag = (tagResult.structuredContent as any).tag
	invariant(tag, '🚨 No tag resource found')
	invariant(tag.id, '🚨 No tag ID found')

	// Delete the tag, which should trigger elicitation and be declined
	const deleteResult = await client.callTool({
		name: 'delete_tag',
		arguments: { id: tag.id },
	})
	const structuredContent = deleteResult.structuredContent as any

	expect(
		structuredContent.success,
		'🚨 structuredContent.success should be false after declining to delete a tag',
	).toBe(false)
})

test('Advanced Sampling', async () => {
	await using setup = await setupClient({ capabilities: { sampling: {} } })
	const { client } = setup
	const messageResultDeferred = await deferred<CreateMessageResult>()
	const messageRequestDeferred =
		await deferred<z.infer<typeof CreateMessageRequestSchema>>()

	client.setRequestHandler(CreateMessageRequestSchema, (r) => {
		messageRequestDeferred.resolve(r)
		return messageResultDeferred.promise
	})

	const fakeTag1 = {
		name: faker.lorem.word(),
		description: faker.lorem.sentence(),
	}
	const fakeTag2 = {
		name: faker.lorem.word(),
		description: faker.lorem.sentence(),
	}

	const result = await client.callTool({
		name: 'create_tag',
		arguments: fakeTag1,
	})
	const newTag1 = (result.structuredContent as any).tag
	invariant(newTag1, '🚨 No tag1 resource found')
	invariant(newTag1.id, '🚨 No new tag1 found')

	const entry = {
		title: faker.lorem.words(3),
		content: faker.lorem.paragraphs(2),
	}
	await client.callTool({
		name: 'create_entry',
		arguments: entry,
	})
	const request = await messageRequestDeferred.promise

	try {
		expect(
			request,
			'🚨 request should be a sampling/createMessage request',
		).toEqual(
			expect.objectContaining({
				method: 'sampling/createMessage',
				params: expect.objectContaining({
					maxTokens: expect.any(Number),
					systemPrompt: expect.stringMatching(/example/i),
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: 'user',
							content: expect.objectContaining({
								type: 'text',
								text: expect.stringMatching(/entry/i),
								mimeType: 'application/json',
							}),
						}),
					]),
				}),
			}),
		)

		// 🚨 Proactive checks for advanced sampling requirements
		const params = request.params
		invariant(
			params && 'maxTokens' in params,
			'🚨 maxTokens parameter is required',
		)
		invariant(
			params.maxTokens > 50,
			'🚨 maxTokens should be increased for longer responses (>50)',
		)

		invariant(params && 'systemPrompt' in params, '🚨 systemPrompt is required')
		invariant(
			typeof params.systemPrompt === 'string',
			'🚨 systemPrompt must be a string',
		)

		invariant(
			params && 'messages' in params && Array.isArray(params.messages),
			'🚨 messages array is required',
		)
		const userMessage = params.messages.find((m) => m.role === 'user')
		invariant(userMessage, '🚨 User message is required')
		invariant(
			userMessage.content.mimeType === 'application/json',
			'🚨 Content should be JSON for structured data',
		)

		// 🚨 Validate the JSON structure contains required fields
		invariant(
			typeof userMessage.content.text === 'string',
			'🚨 User message content text must be a string',
		)
		let messageData: any
		try {
			messageData = JSON.parse(userMessage.content.text)
		} catch (error) {
			throw new Error('🚨 User message content must be valid JSON')
		}

		invariant(messageData.entry, '🚨 JSON should contain entry data')
		invariant(
			messageData.existingTags,
			'🚨 JSON should contain existingTags for context',
		)
		invariant(
			Array.isArray(messageData.existingTags),
			'🚨 existingTags should be an array',
		)
	} catch (error) {
		console.error('🚨 Advanced sampling features not properly implemented!')
		console.error(
			'🚨 This exercise requires you to send a structured sampling request to the LLM with the new entry, its current tags, and all existing tags, as JSON (application/json).',
		)
		console.error('🚨 You need to:')
		console.error(
			'🚨   1. Increase maxTokens to a reasonable value (e.g., 100+) for longer responses.',
		)
		console.error(
			'🚨   2. Create a meaningful systemPrompt that includes examples of the expected output format (array of tag objects, with examples for existing and new tags).',
		)
		console.error(
			'🚨   3. Structure the user message as JSON with mimeType: "application/json".',
		)
		console.error(
			'🚨   4. Include both entry data AND existingTags context in the JSON (e.g., { entry: {...}, existingTags: [...] }).',
		)
		console.error(
			'🚨   5. Test your prompt in an LLM playground and refine as needed.',
		)
		console.error(
			'🚨 EXAMPLE: systemPrompt should include examples of expected tag suggestions.',
		)
		console.error(
			'🚨 EXAMPLE: user message should be structured JSON, not plain text.',
		)

		const params = request.params
		if (params) {
			console.error(`🚨 Current maxTokens: ${params.maxTokens} (should be >50)`)
			console.error(
				`🚨 Current mimeType: ${params.messages?.[0]?.content?.mimeType} (should be "application/json")`,
			)
			console.error(
				`🚨 SystemPrompt contains "example": ${typeof params.systemPrompt === 'string' && params.systemPrompt.toLowerCase().includes('example')}`,
			)
		}

		throw new Error(
			`🚨 Advanced sampling not configured properly - need structured JSON messages, higher maxTokens, and example-rich system prompt. ${error}`,
		)
	}

	messageResultDeferred.resolve({
		model: 'stub-model',
		stopReason: 'endTurn',
		role: 'assistant',
		content: {
			type: 'text',
			text: JSON.stringify([{ id: newTag1.id }, fakeTag2]),
		},
	})

	// give the server a chance to process the result
	await new Promise((resolve) => setTimeout(resolve, 100))
})

test('Progress notification: create_wrapped_video (mock)', async () => {
	await using setup = await setupClient()
	const { client } = setup

	const progressDeferred = await deferred<any>()
	client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
		progressDeferred.resolve(notification)
	})

	// Ensure the tool is enabled by creating a tag and an entry first
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

	// Call the tool with mockTime: 500
	const progressToken = faker.string.uuid()
	const createVideoResult = await client.callTool({
		name: 'create_wrapped_video',
		arguments: {
			mockTime: 500,
		},
		_meta: {
			progressToken,
		},
	})

	// Verify the tool call completed successfully
	expect(
		createVideoResult.structuredContent,
		'🚨 create_wrapped_video should return structured content',
	).toBeDefined()

	let progressNotif
	try {
		progressNotif = await Promise.race([
			progressDeferred.promise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('timeout')), 2000),
			),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive progress notification for create_wrapped_video (mock). Make sure your tool sends progress updates when running in mock mode.',
		)
	}

	expect(
		progressNotif,
		'🚨 Did not receive progress notification for create_wrapped_video (mock).',
	).toBeDefined()

	expect(
		typeof progressNotif.params.progress,
		'🚨 progress should be a number',
	).toBe('number')
	expect(
		progressNotif.params.progress,
		'🚨 progress should be a number between 0 and 1',
	).toBeGreaterThanOrEqual(0)
	expect(
		progressNotif.params.progress,
		'🚨 progress should be a number between 0 and 1',
	).toBeLessThanOrEqual(1)
	expect(
		progressNotif.params.progressToken,
		'🚨 progressToken should match the token sent in the tool call',
	).toBe(progressToken)
})

test('Cancellation support: create_wrapped_video (mock)', async () => {
	await using setup = await setupClient()
	const { client } = setup

	// Ensure the tool is enabled by creating a tag and an entry first
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

	// Test that the tool can handle cancellation by setting a very short mock time
	// and verifying it can be cancelled (simulation of cancellation capability)
	const progressToken = faker.string.uuid()
	let progressCount = 0
	client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
		if (notification.params.progressToken === progressToken) {
			progressCount++
		}
	})

	// Call the tool with a short mock time to simulate cancellation capability
	const mockTime = 100 // Very short time
	const createVideoResult = await client.callTool({
		name: 'create_wrapped_video',
		arguments: {
			mockTime,
			cancelAfter: 50, // Cancel after 50ms if supported
		},
		_meta: {
			progressToken,
		},
	})

	// The tool should either complete successfully or handle cancellation gracefully
	expect(
		createVideoResult.structuredContent,
		'🚨 Tool should return structured content indicating completion or cancellation status',
	).toBeDefined()

	// For this exercise, we're testing that the tool infrastructure supports cancellation
	// The actual implementation will depend on how the server handles AbortSignal
	const content = createVideoResult.structuredContent as any
	expect(
		content.status || content.success !== false,
		'🚨 Tool should indicate whether it completed or was cancelled',
	).toBeTruthy()

	// Verify we received progress updates
	expect(
		progressCount,
		'🚨 Should have received at least one progress update during execution',
	).toBeGreaterThan(0)
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
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('timeout')), 2000),
			),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive prompts/listChanged notification when expected. Make sure your server calls sendPromptListChanged when prompts are enabled/disabled.',
		)
	}
	expect(
		promptNotif,
		'🚨 Did not receive prompts/listChanged notification when expected. Make sure your server calls sendPromptListChanged when prompts are enabled/disabled.',
	).toBeDefined()
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

	// Initially resources should be disabled/empty
	const initialResources = await client.listResources()
	expect(
		initialResources.resources,
		'🚨 Resources should initially be empty when no entries/tags exist',
	).toHaveLength(0)

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

	// Should receive resource listChanged notification
	let resourceNotif
	try {
		resourceNotif = await Promise.race([
			resourceListChanged.promise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('timeout')), 2000),
			),
		])
	} catch {
		throw new Error(
			'🚨 Did not receive resources/listChanged notification when expected. Make sure your server calls sendResourceListChanged when resources are enabled/disabled.',
		)
	}
	expect(
		resourceNotif,
		'🚨 Did not receive resources/listChanged notification when expected. Make sure your server calls sendResourceListChanged when resources are enabled/disabled.',
	).toBeDefined()

	// After notification, resources should now be available
	const enabledResources = await client.listResources()
	expect(
		enabledResources.resources.length,
		'🚨 Resources should be enabled after creating entries/tags. The server must dynamically enable/disable resources based on content.',
	).toBeGreaterThan(0)

	// Verify that resources are properly available
	const resourceUris = enabledResources.resources.map((r) => r.uri)
	expect(
		resourceUris.some((uri) => uri.includes('entries')),
		'🚨 Should have entry resources available after creating entries',
	).toBe(true)
	expect(
		resourceUris.some((uri) => uri.includes('tags')),
		'🚨 Should have tag resources available after creating tags',
	).toBe(true)
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

	// Get initial tool list
	const initialTools = await client.listTools()
	const initialToolNames = initialTools.tools.map((t) => t.name)

	// Should not have tools requiring exisitng entries
	expect(
		initialToolNames,
		'🚨 Tools requiring entries like get_entry should not be available initially',
	).not.toContain('get_entry')

	// Trigger a DB change that should enable additional tools
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

	// Should receive tool listChanged notification
	let toolNotif
	try {
		toolNotif = await Promise.race([
			toolListChanged.promise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('timeout')), 2000),
			),
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

	// After notification, additional tools should be available
	const enabledTools = await client.listTools()
	const enabledToolNames = enabledTools.tools.map((t) => t.name)
	expect(
		enabledToolNames,
		'🚨 Tools requiring entries like get_entry should be enabled after creating entries/tags. The server must dynamically enable/disable tools based on content.',
	).toContain('get_entry')

	// Verify that tools are properly enabled with correct count
	expect(
		enabledTools.tools.length,
		'🚨 Should have more tools available after creating content',
	).toBeGreaterThan(initialTools.tools.length)
})
