/* eslint-disable no-unused-vars */

import {LogicalSegment} from './logical/logical_segment';

export type TypeKeys = keyof typeof Type;
export enum Type {
  // PORT=0,
  LOGICAL=1
    /* NETWORK=2,
    SYMBOLIC=3,
    DATA=4,
    DATA_TYPE_CONST=5,
    DATA_TYPE_ELEM=6,
    RESERVED=7 */
}

/**
* @enum TypeObject
* Constant to enumerate each segment type
* and the Object herited from segment associated
*/
export const TypeObject = {
  // PORT:null, // not implented from now
  LOGICAL: LogicalSegment,
  /* NETWORK:null, // not implented from now
    SYMBOLIC:null, // not implented from now
    DATA:null, // not implented from now
    DATA_TYPE_CONST:null, // not implented from now
    DATA_TYPE_ELEM:null, // not implented from now
    RESERVED:null // not implented from now */
};

// export {SegmentType, SegmentTypeKeys, SegmentTypeObject}
