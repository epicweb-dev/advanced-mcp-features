import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { DB } from './db/index.ts'
import { initializePrompts } from './prompts.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'

export class EpicMeMCP {
	db: DB
	// 🐨 add a state object with a loggingLevel property set to 'info'
	server = new McpServer(
		{
			name: 'epicme',
			title: 'EpicMe',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
				completions: {},
				// 🐨 add the `logging` capability to the `capabilities` object
				prompts: {},
			},
			instructions: `
EpicMe is a journaling app that allows users to write about and review their experiences, thoughts, and reflections.

These tools are the user's window into their journal. With these tools and your help, they can create, read, and manage their journal entries and associated tags.

You can also help users add tags to their entries and get all tags for an entry.
			`.trim(),
		},
	)

	constructor(path: string) {
		this.db = DB.getInstance(path)
	}
	async init() {
		await initializeTools(this)
		await initializeResources(this)
		await initializePrompts(this)
	}
}

async function main() {
	const agent = new EpicMeMCP(process.env.EPIC_ME_DB_PATH ?? './db.sqlite')
	await agent.init()
	const transport = new StdioServerTransport()
	await agent.server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
