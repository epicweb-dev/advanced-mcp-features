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
