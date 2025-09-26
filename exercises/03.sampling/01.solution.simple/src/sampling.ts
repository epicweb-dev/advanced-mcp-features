import { type EpicMeMCP } from './index.ts'

export async function suggestTagsSampling(agent: EpicMeMCP, entryId: number) {
	const clientCapabilities = agent.server.server.getClientCapabilities()
	if (!clientCapabilities?.sampling) {
		console.error('Client does not support sampling, skipping sampling request')
		return
	}

	const result = await agent.server.server.createMessage({
		systemPrompt: `
You are a helpful assistant.

We'll put more in here later...
		`.trim(),
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					mimeType: 'text/plain',
					text: `
You just created a new journal entry with the id ${entryId}.

Please respond with a proper commendation for yourself.
					`.trim(),
				},
			},
		],
		maxTokens: 10,
	})

	void agent.server.server.sendLoggingMessage({
		level: 'info',
		logger: 'tag-generator',
		data: {
			message: 'Received response from model',
			modelResponse: result.content.text,
		},
	})
}
