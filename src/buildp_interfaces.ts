
export interface BuildProcessPacket {
  sequence?:Stage[],
  status: 'SUCCESS'|'ERROR',
  tree?:string,
  error?:string,
}

export interface Stage {
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
