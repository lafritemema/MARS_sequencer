import {AxiosRequestConfig} from 'axios';

export interface BuildProcessorResponse {
  sequence?:Stage[],
  status: 'SUCCESS'|'ERROR',
  processTree: TreeStep[],
  error?:string,
}

export interface Stage {
  id:string,
  description:string,
  requestSequence:Action[],
  type:string,
}

export interface Action {
  action:'REQUEST'| 'WAIT',
  target:'PROXY' | 'HMI',
  description: string,
  definition: ProxyRequestDefinition | HMIRequestDefinition,
}

export interface ProxyRequestDefinition {
  api:string,
  body:object,
  method:'PUT'|'GET'|'SUBSCRIBE',
  query:object,
}

export interface HMIRequestDefinition {
  message:string
}

export interface ProxyResponse {
  status:'ERROR'|'SUCCESS',
  data?:object,
  error?:string
}

export interface ProxyAlert {
  type: 'TRACKER',
  status: 'SUCCESS' | 'ERROR'
  error?:string
}

export interface ActionRequest {
  type: 'REQUEST.PROXY'| 'WAIT.PROXY' | 'REQUEST.HMI'| 'WAIT.HMI',
  stageId:string,
  description: string,
  definition: AxiosRequestConfig<any> | HMIRequest | undefined
}

export interface HMIRequest {
  id:string,
  message:string,
  description:string,
}


export interface TreeStep {
  stepStages:TreeStage[]
}
export interface TreeStage {
  id:string,
  type:string,
  description:string,
}

export interface Status{
  status: 'SUCCESS' | 'ERROR'
  error?:string,
}

export interface ProcessStageStatus extends Status {
  id: string
}
