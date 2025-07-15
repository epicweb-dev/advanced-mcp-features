#!/usr/bin/env node

import { createServer } from 'http'
import { randomBytes } from 'node:crypto'
import { styleText } from 'node:util'
import { platform } from 'node:os'
import { execa } from 'execa'
import getPort from 'get-port'
import httpProxy from 'http-proxy'

const { createProxyServer } = httpProxy

const [, , ...args] = process.argv
const [transport] = args

const serverPort = await getPort({
	port: Array.from({ length: 1000 }, (_, i) => i + 10000),
	exclude: [process.env.PORT].filter(Boolean).map(Number),
})
const clientPort = await getPort({
	port: Array.from({ length: 1000 }, (_, i) => i + 9000),
	exclude: [process.env.PORT, serverPort].filter(Boolean).map(Number),
})

const sessionToken = randomBytes(32).toString('hex')

// Windows-specific handling for MCP Inspector
const isWindows = platform() === 'win32'
const mcpInspectorCommand = isWindows ? 'npx' : 'mcp-inspector'
const mcpInspectorArgs = isWindows ? ['@modelcontextprotocol/inspector'] : []

console.log(styleText('cyan', '🔧 Starting MCP Inspector...'))
console.log(styleText('gray', `Platform: ${platform()}`))
console.log(styleText('gray', `Command: ${mcpInspectorCommand} ${mcpInspectorArgs.join(' ')}`))

// Spawn mcp-inspector as a sidecar process
const inspectorProcess = execa(mcpInspectorCommand, mcpInspectorArgs, {
	env: {
		...process.env,
		SERVER_PORT: serverPort,
		CLIENT_PORT: clientPort,
		MCP_PROXY_TOKEN: sessionToken,
		MCP_AUTO_OPEN_ENABLED: 'false',
		ALLOWED_ORIGINS: [
			`http://localhost:${clientPort}`,
			`http://127.0.0.1:${clientPort}`,
			`http://localhost:${process.env.PORT}`,
			`http://127.0.0.1:${process.env.PORT}`,
		].join(','),
	},
	stdio: ['inherit', 'pipe', 'pipe'], // capture both stdout and stderr
})

// Enhanced error handling for inspector process
inspectorProcess.catch((error) => {
	console.error(styleText('red', '❌ MCP Inspector failed to start:'))
	console.error(styleText('red', error.message))
	if (isWindows) {
		console.error(styleText('yellow', '💡 Windows troubleshooting tips:'))
		console.error(styleText('yellow', '1. Ensure Node.js is installed and in PATH'))
		console.error(styleText('yellow', '2. Try running: npm install -g @modelcontextprotocol/inspector'))
		console.error(styleText('yellow', '3. Check if Windows Defender is blocking the process'))
	}
	process.exit(1)
})

// Handle stderr output
inspectorProcess.stderr.on('data', (data) => {
	const str = data.toString()
	console.error(styleText('red', `Inspector stderr: ${str}`))
})

// Wait for the inspector to be up before starting the proxy server
function waitForInspectorReady() {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('MCP Inspector failed to start within 30 seconds'))
		}, 30000)

		inspectorProcess.stdout.on('data', (data) => {
			const str = data.toString()
			// Suppress specific logs from inspector
			if (
				str.includes('Proxy server listening on port') ||
				str.includes('MCP Inspector is up and running')
			) {
				// Do not print these lines
				if (str.includes('MCP Inspector is up and running')) {
					clearTimeout(timeout)
					resolve()
				}
				return
			}
			process.stdout.write(str) // print all other inspector logs
		})

		inspectorProcess.on('exit', (code) => {
			clearTimeout(timeout)
			if (code !== 0) {
				reject(new Error(`MCP Inspector exited with code ${code}`))
			}
		})
	})
}

try {
	await waitForInspectorReady()
	console.log(styleText('green', '✅ MCP Inspector is ready!'))
} catch (error) {
	console.error(styleText('red', '❌ Failed to start MCP Inspector:'))
	console.error(styleText('red', error.message))
	process.exit(1)
}

const proxy = createProxyServer({
	target: `http://localhost:${clientPort}`,
	ws: true,
	changeOrigin: true,
})

const server = createServer((req, res) => {
	if (req.url === '/' || req.url.startsWith('/?')) {
		const url = new URL(req.url, `http://localhost:${clientPort}`)
		const transport = 'stdio'
		const command = 'npm'
		// Windows-compatible command args
		const args = isWindows 
			? `--silent --prefix "${process.cwd()}" run dev:mcp`
			: `--silent --prefix "${process.cwd()}" run dev:mcp`
		
		url.searchParams.set('transport', transport)
		url.searchParams.set('serverCommand', command)
		url.searchParams.set('serverArgs', args)
		url.searchParams.set('MCP_PROXY_AUTH_TOKEN', sessionToken)
		url.searchParams.set(
			'MCP_PROXY_FULL_ADDRESS',
			`http://localhost:${serverPort}`,
		)
		url.searchParams.set('MCP_REQUEST_MAX_TOTAL_TIMEOUT', 1000 * 60 * 15)
		url.searchParams.set('MCP_SERVER_REQUEST_TIMEOUT', 1000 * 60 * 5)
		const correctedUrl = url.pathname + url.search
		if (correctedUrl !== req.url) {
			res.writeHead(302, { Location: correctedUrl })
			res.end()
			return
		}
	}
	proxy.web(req, res, {}, (err) => {
		res.writeHead(502, { 'Content-Type': 'text/plain' })
		res.end('Proxy error: ' + err.message)
	})
})

server.on('upgrade', (req, socket, head) => {
	proxy.ws(req, socket, head)
})

server.listen(process.env.PORT, () => {
	// Enhanced, colorized logs
	const proxyUrl = `http://localhost:${process.env.PORT}`
	console.log(
		styleText('cyan', `🐨 Proxy server running: `) +
			styleText('green', proxyUrl),
	)
	console.log(
		styleText('gray', `- Client port: `) +
			styleText('magenta', clientPort.toString()),
	)
	console.log(
		styleText('gray', `- Server port: `) +
			styleText('yellow', serverPort.toString()),
	)
	console.log(
		styleText('gray', `- Session token: `) +
			styleText('blue', sessionToken),
	)
	if (isWindows) {
		console.log(
			styleText('yellow', `💡 Windows users: If you experience issues, try opening as administrator`),
		)
	}
})

// Ensure proper cleanup
function cleanup() {
	if (inspectorProcess && !inspectorProcess.killed) {
		inspectorProcess.kill()
	}
	proxy.close()
	server.close(() => {
		console.log('HTTP server closed')
	})
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
	cleanup()
	process.exit(0)
})
process.on('SIGTERM', () => {
	cleanup()
	process.exit(0)
})
