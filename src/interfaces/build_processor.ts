export interface BuildProcessReport {
  sequence:Action[]
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

