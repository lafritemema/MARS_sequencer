
export interface BuildProcessPacket {
  sequence?:Stage[],
  status: 'SUCCESS'|'ERROR',
  tree:Action[],
  error?:string,
}

export interface Stage {
  id:string,
  description:string,
  requestSequence:RequestStage[],
  type:string,
}


export interface RequestStage {
  action:'REQUEST'|'WAIT',
  description:string,
  definition:Definition,
}

interface Definition {
  api:string,
  body:object,
  method:'PUT'|'GET'|'SUBSCRIBE',
  query:object,
}

interface Action {
  id:string,
  description:string,
}
