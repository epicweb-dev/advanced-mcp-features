import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { test, expect } from 'vitest'

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

	// List tools again now that entry and tag exist
	list = await client.listTools()
	toolMap = Object.fromEntries(list.tools.map((t) => [t.name, t]))

	// Check delete_entry annotations and outputSchema
	const deleteEntryTool = toolMap['delete_entry']
	invariant(deleteEntryTool, '🚨 delete_entry tool not found')
	expect(
		deleteEntryTool.annotations,
		'🚨 delete_entry missing annotations',
	).toEqual(expect.objectContaining({ openWorldHint: false }))
	expect(
		deleteEntryTool.outputSchema,
		'🚨 delete_entry missing outputSchema',
	).toBeDefined()

	// Check delete_tag annotations and outputSchema
	const deleteTagTool = toolMap['delete_tag']
	invariant(deleteTagTool, '🚨 delete_tag tool not found')
	expect(
		deleteTagTool.annotations,
		'🚨 delete_tag missing annotations',
	).toEqual(expect.objectContaining({ openWorldHint: false }))
	expect(
		deleteTagTool.outputSchema,
		'🚨 delete_tag missing outputSchema',
	).toBeDefined()

	// Test structured content in responses

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

test('Elicitation: delete_tag confirmation', async () => {
	await using setup = await setupClient({ capabilities: { elicitation: {} } })
	const { client } = setup

	// Set up a handler for elicitation requests
	let elicitationRequest: any
	client.setRequestHandler(ElicitRequestSchema, (req) => {
		elicitationRequest = req
		// Simulate user accepting the confirmation
		return {
			action: 'accept',
			content: { confirmed: true },
		}
	})

	// Create a tag to delete
	const tagResult = await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'Elicit Test Tag 2',
			description: 'Testing elicitation acceptance.',
		},
	})
	const tag = (tagResult.structuredContent as any).tag
	invariant(tag, '🚨 No tag resource found')
	invariant(tag.id, '🚨 No tag ID found')

	// Delete the tag, which should trigger elicitation
	const deleteResult = await client.callTool({
		name: 'delete_tag',
		arguments: { id: tag.id },
	})
	const structuredContent = deleteResult.structuredContent as any
	invariant(
		structuredContent,
		'🚨 No structuredContent returned from delete_tag',
	)
	invariant(
		'success' in structuredContent,
		'🚨 structuredContent missing success field',
	)
	expect(
		structuredContent.success,
		'🚨 structuredContent.success should be true after accepting deletion of a tag',
	).toBe(true)

	invariant(elicitationRequest, '🚨 No elicitation request was sent')
	const params = elicitationRequest.params
	invariant(params, '🚨 elicitationRequest missing params')

	expect(
		params.message,
		'🚨 elicitationRequest.params.message should match expected confirmation prompt',
	).toMatch(/Are you sure you want to delete tag/i)

	expect(
		params.requestedSchema,
		'🚨 elicitationRequest.params.requestedSchema should match expected schema',
	).toEqual(
		expect.objectContaining({
			type: 'object',
			properties: expect.objectContaining({
				confirmed: expect.objectContaining({ type: 'boolean' }),
			}),
		}),
	)
})
