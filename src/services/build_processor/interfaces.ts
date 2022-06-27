import {Configuration} from '@common/interfaces';

export interface BuildProcessReport {
  buildProcess:Action[]
}

export interface Action {
  assets:Asset[]
  description:string,
  type:string
  uid:string
}

export interface Asset {
  description:string
  interface:string,
  uid:string
}

export interface RequestConfiguration extends Configuration {
  sequenceToRun:string,
  definitions:{[defkey:string]:RequestDefinition}
}

export interface RequestDefinition {
  body: RequestBody,
  path: string,
  description: string,
}

interface RequestBody {
  goalsDefinition:GoalsDefinition,
}

interface GoalsDefinition {
  definitionType: 'area',
  definition: AreaDefinition,
}

type Rails = 'y-254' | 'y+254' | 'y+763' | 'y-763' | 'y+1292' | 'y-1292'

interface AreaDefinition {
  railArea?: 'all'|'flange'|'web',
  rails?: 'all'| Rails[],
  crossbeamSide: 'front'| 'rear'| 'all',
  railSide: 'left'| 'right'| 'all',
}
