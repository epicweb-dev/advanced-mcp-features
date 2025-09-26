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
	// 🐨 logging message to send the model response to the client
	// 📜 https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging#log-message-notifications
	// 💰 agent.server.server.sendLoggingMessage (with level of 'info', logger of 'sampling', and data with the model response)
	// 🦉 The SDK will make sure to only send messages if the logging level is 'debug' or 'info'
}
