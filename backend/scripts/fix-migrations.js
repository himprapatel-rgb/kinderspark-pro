#!/usr/bin/env node
// Deletes stuck (started but never finished) migration rows so migrate deploy can proceed.
const { execSync } = require('child_process')

const sql = `DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL;`

try {
  // Write SQL to a temp file to avoid shell quoting issues
  const fs = require('fs')
  const tmp = '/tmp/fix-migrations.sql'
  fs.writeFileSync(tmp, sql)
  const out = execSync(`npx prisma db execute --file ${tmp}`, { encoding: 'utf8' })
  if (out) console.log('fix-migrations:', out.trim())
  fs.unlinkSync(tmp)
} catch (err) {
  // Non-fatal: if the table doesn't exist yet or prisma db execute fails, proceed anyway
  console.log('fix-migrations (non-fatal):', err.message.split('\n')[0])
}
