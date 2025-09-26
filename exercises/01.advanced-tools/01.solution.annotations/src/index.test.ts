import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
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

test('Tool annotations', async () => {
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

	// Create a tag and entry to enable other tools
	const tagResult = await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'TestTag',
			description: 'A tag for testing',
		},
	})

	const entryResult = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})

	// List tools again now that entry and tag exist
	list = await client.listTools()
	toolMap = Object.fromEntries(list.tools.map((t) => [t.name, t]))

	// Check get_entry annotations (read-only)
	const getEntryTool = toolMap['get_entry']
	invariant(getEntryTool, '🚨 get_entry tool not found')
	expect(getEntryTool.annotations, '🚨 get_entry missing annotations').toEqual(
		expect.objectContaining({
			readOnlyHint: true,
			openWorldHint: false,
		}),
	)

	// Check list_entries annotations (read-only)
	const listEntriesTool = toolMap['list_entries']
	invariant(listEntriesTool, '🚨 list_entries tool not found')
	expect(
		listEntriesTool.annotations,
		'🚨 list_entries missing annotations',
	).toEqual(
		expect.objectContaining({
			readOnlyHint: true,
			openWorldHint: false,
		}),
	)

	// Check update_entry annotations (idempotent)
	const updateEntryTool = toolMap['update_entry']
	invariant(updateEntryTool, '🚨 update_entry tool not found')
	expect(
		updateEntryTool.annotations,
		'🚨 update_entry missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		}),
	)

	// Check delete_entry annotations
	const deleteEntryTool = toolMap['delete_entry']
	invariant(deleteEntryTool, '🚨 delete_entry tool not found')
	expect(
		deleteEntryTool.annotations,
		'🚨 delete_entry missing annotations',
	).toEqual(expect.objectContaining({ openWorldHint: false }))

	// Check get_tag annotations (read-only)
	const getTagTool = toolMap['get_tag']
	invariant(getTagTool, '🚨 get_tag tool not found')
	expect(getTagTool.annotations, '🚨 get_tag missing annotations').toEqual(
		expect.objectContaining({
			readOnlyHint: true,
			openWorldHint: false,
		}),
	)

	// Check list_tags annotations (read-only)
	const listTagsTool = toolMap['list_tags']
	invariant(listTagsTool, '🚨 list_tags tool not found')
	expect(listTagsTool.annotations, '🚨 list_tags missing annotations').toEqual(
		expect.objectContaining({
			readOnlyHint: true,
			openWorldHint: false,
		}),
	)

	// Check update_tag annotations (idempotent)
	const updateTagTool = toolMap['update_tag']
	invariant(updateTagTool, '🚨 update_tag tool not found')
	expect(
		updateTagTool.annotations,
		'🚨 update_tag missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		}),
	)

	// Check delete_tag annotations (idempotent)
	const deleteTagTool = toolMap['delete_tag']
	invariant(deleteTagTool, '🚨 delete_tag tool not found')
	expect(
		deleteTagTool.annotations,
		'🚨 delete_tag missing annotations',
	).toEqual(expect.objectContaining({ openWorldHint: false }))

	// Check add_tag_to_entry annotations (idempotent)
	const addTagToEntryTool = toolMap['add_tag_to_entry']
	invariant(addTagToEntryTool, '🚨 add_tag_to_entry tool not found')
	expect(
		addTagToEntryTool.annotations,
		'🚨 add_tag_to_entry missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		}),
	)

	// Check create_wrapped_video annotations
	const createWrappedVideoTool = toolMap['create_wrapped_video']
	invariant(createWrappedVideoTool, '🚨 create_wrapped_video tool not found')
	expect(
		createWrappedVideoTool.annotations,
		'🚨 create_wrapped_video missing annotations',
	).toEqual(
		expect.objectContaining({
			destructiveHint: false,
			openWorldHint: false,
		}),
	)
})

test('Basic tool functionality', async () => {
	await using setup = await setupClient()
	const { client } = setup

	// Test create_entry
	const entryResult = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})
	expect(entryResult.content).toBeDefined()
	expect(Array.isArray(entryResult.content)).toBe(true)
	expect((entryResult.content as any[]).length).toBeGreaterThan(0)

	// Test create_tag
	const tagResult = await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'TestTag',
			description: 'A tag for testing',
		},
	})
	expect(tagResult.content).toBeDefined()
	expect(Array.isArray(tagResult.content)).toBe(true)
	expect((tagResult.content as any[]).length).toBeGreaterThan(0)

	// Test basic CRUD operations work
	const list = await client.listTools()
	const toolNames = list.tools.map((t) => t.name)
	expect(toolNames).toContain('create_entry')
	expect(toolNames).toContain('create_tag')
	expect(toolNames).toContain('get_entry')
	expect(toolNames).toContain('get_tag')
	expect(toolNames).toContain('list_entries')
	expect(toolNames).toContain('list_tags')
	expect(toolNames).toContain('update_entry')
	expect(toolNames).toContain('update_tag')
	expect(toolNames).toContain('delete_entry')
	expect(toolNames).toContain('delete_tag')
	expect(toolNames).toContain('add_tag_to_entry')
	expect(toolNames).toContain('create_wrapped_video')
})
