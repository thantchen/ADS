import * as promptly from 'promptly'
import { ArgumentParser } from 'argparse'
import * as keystore from 'lib/keystore'
import { terraDB, tempuraDB } from 'database'

// To run use `yarn import-key <...options>`
async function main() {
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'Imports key into database'
  })

  parser.addArgument(['-c', '--chain-name'], {
    help: 'chain name',
    choices: ['terra', 'tempura'],
    required: true
  })

  parser.addArgument(['-k', '--key'], {
    help: 'key',
    required: true
  })

  const args = parser.parseArgs()
  const password = await promptly.password(`Enter a passphrase to encrypt your key to disk:`, { replace: `*` })
  const confirm = await promptly.password(`Repeat the passphrase:`, { replace: `*` })

  if (password.length < 8) {
    console.error(`ERROR: password must be at least 8 characters`)
    return
  }

  if (password !== confirm) {
    console.error(`ERROR: passphrases don't matchPassword confirm failed`)
    return
  }

  const mnemonic = await promptly.prompt(`Enter bip39 mnemonic for ${args.key}: `)

  await keystore.create(
    args.chain_name === 'terra' ? terraDB : tempuraDB,
    args.chain_name,
    args.key,
    password,
    mnemonic
  )
  await terraDB.close()
  await tempuraDB.close()
}

main().catch(console.error)
