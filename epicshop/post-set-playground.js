import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { execa } from 'execa'

const playgroundDir = process.env.EPICSHOP_PLAYGROUND_DEST_DIR
const seedPath = join(playgroundDir, 'src', 'db', 'seed.ts')

// Delete the database file if it exists to prevent EBUSY errors when switching playgrounds
const dbPath = join(playgroundDir, 'db.sqlite')
if (existsSync(dbPath)) {
	console.log('Deleting existing database file...')
	try {
		await unlink(dbPath)
		console.log('Database file deleted successfully')
	} catch (error) {
		console.warn('Failed to delete database file:', error.message)
		// Continue anyway - the seed script will also try to delete it
	}
}

if (existsSync(seedPath)) {
	console.log('Running seed script...')
	try {
		await execa('npx', ['tsx', seedPath], {
			cwd: playgroundDir,
			stdio: 'inherit',
		})
		console.log('Seed script completed successfully')
	} catch (error) {
		console.error('Failed to run seed script:', error)
	}
}
