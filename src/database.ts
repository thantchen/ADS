import * as level from 'level'
import * as config from 'config'

export const tempuraDB = level(config.db.tempura.path)
export const terraDB = level(config.db.terra.path)
