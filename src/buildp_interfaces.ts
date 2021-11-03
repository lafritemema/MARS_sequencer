import {AxiosRequestConfig} from 'axios';

export interface BuildProcessPacket {
  sequence?:Stage[],
  status: 'SUCCESS'|'ERROR',
  tree: object,
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
  description:string,
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
  error?:object
}

export interface ActionRequest {
  type: 'REQUEST.PROXY'| 'WAIT.PROXY' | 'REQUEST.HMI'| 'WAIT.HMI',
  definition: AxiosRequestConfig<any> | HMIMessage | undefined
}

export interface HMIMessage {
  id?:string
  message:string,
  description:string
}