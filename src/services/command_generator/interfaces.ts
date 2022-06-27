import {CommandDefinition} from '@common/interfaces';

export interface CommandGenReport{
  commands:Command[],
  uid:string,
}

export interface Command {
  action:string // 'REQUEST'|'WAIT',
  definition:CommandDefinition,
  description:string,
  target:string // 'PROXY'|'HMI',
  uid:string,
}

export interface RequestBody {
  id:string
}
