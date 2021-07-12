// import {SegmentFactory} from './segments/segment_factory';
// import {Segment} from './segments/segment';

// eslint-disable-next-line spaced-comment

import * as SEGMENT from './segment';

/**
 * @class Path
 */
export class Path {
  /**
     *tee
     * @param {number} pathSize
     * @param {Buffer} pathBuffer : hex buffer to parse
     * @return {Segment[]} Segment object describing the buffer
     */
  public static parse(pathSize: number, pathBuffer:Buffer): SEGMENT.Segment[] {
    // get only the 3 higher bits describing the segment to get the segment type
    // to obtain the type code

    const segments :SEGMENT.Segment[] = [];
    let cursor:number = 0;

    while (cursor < pathBuffer.length) {
      // segment.parseMeta(pathBuffer.slice(cursor, cursor+1));
      // eslint-disable-next-line max-len
      const typedSegment :SEGMENT.Segment = SEGMENT.parseMeta(pathBuffer.slice(cursor, cursor+1));
      const dataBuffer = pathBuffer.slice(
          cursor + 1,
          cursor + typedSegment.dataSize + 1,
      );

      typedSegment.parseData(dataBuffer);

      segments.push(typedSegment);

      cursor+=typedSegment.dataSize+1;
    }
    return segments;
  }
}
