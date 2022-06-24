export interface CommandGenReport{
  commands:Command[],
}

export interface Command {
  action:string // 'REQUEST'|'WAIT',
  definition:CommandDefinition,
  description:string,
  target:string // 'PROXY'|'HMI',
}

export interface CommandDefinition {
  path:string,
  method:string,
  query:Object | undefined,
  body:Object | undefined,
}

