import {Segment} from './segment';
import {Type, TypeKeys, TypeObject} from './segment_type';
import {LogicalSegment} from './logical/logical_segment';


/**
* test
    * @param {Buffer} metaBuffer test
    * @return {Segment}
*/
function parseMeta(metaBuffer:Buffer) : Segment {
  const stcode: number = metaBuffer[0] >>> 5;

  const stype: string = Type[stcode];
  // if no string linked, raise an error
  if (stype == undefined) {
    // eslint-disable-next-line max-len
    throw new Error(`ERROR: The segment type <${stcode}> is not a available segment type`);
  }

  const segment:Segment= TypeObject[<TypeKeys> stype]
      .initialize(metaBuffer);
  return segment;
}


export {Segment,
  LogicalSegment,
  parseMeta};
