import { type EpicMeMCP } from './index.ts'

export async function suggestTagsSampling(agent: EpicMeMCP, entryId: number) {
	// 🐨 get the client capabilities
	// 🐨 if the client does not support sampling, console.error a message and return
	//
	// 🐨 create a message with the server's server
	// 💰 agent.server.server.createMessage
	// 🐨 Make the system prompt something simple to start like "you're a helpful assistant"
	// 🐨 Add a user message with the content "You just created a new journal entry with the id ${entryId}. Please respond with a proper commendation for yourself."
	// 🐨 Set the maxTokens what you think is reasonable for the request
	//
	// 🐨 add a console.error to print the result.content.text (this will show up in the inspector)
}
