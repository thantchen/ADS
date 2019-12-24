import { ArgumentParser } from 'argparse'
import * as level from 'level'
import * as config from 'config'
import * as keystore from 'lib/keystore'
import * as CryptoJS from 'crypto-js'

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

  parser.addArgument(['-p', '--password'], {
    help: 'password'
  })

  const args = parser.parseArgs()
  const db = level(config.db[args.chain_name].path)

  console.info(await keystore.get(db, args.key, args.password || CryptoJS.SHA256(args.key)))

  await db.close()
}

main().catch(console.error)
