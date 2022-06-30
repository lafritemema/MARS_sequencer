import {RequestDefinition} from 'src/server/interfaces';

export interface CommandGenReport{
  commands:Command[],
  uid:string,
}

export interface Command {
  action:string // 'REQUEST'|'WAIT',
  definition:RequestDefinition|WaitDefinition,
  description:string,
  target:string // 'PROXY'|'HMI',
  uid:string,
}

export interface RequestBody {
  uid:string
}

export interface WaitDefinition {
  uid:string,
}
