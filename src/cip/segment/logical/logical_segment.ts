import * as _ from 'lodash';
import {Segment} from '../segment';
// import {SegmentTypeKeys} from '../segment_type';
import {LogicalType} from './logical_type';
import {LogicalFormat, LogicalFormatKey} from './logical_format';

import {BitVector} from '../utils/bitvector';

/**
 * Class represents a logical type segment
 * The logical segment is a type of segment define by the CIP protocol
 * @class LogicalSegment
 * @implement Segment
 */
export class LogicalSegment extends Segment {
    private _type : string;
    private _format: LogicalFormatKey;
    private _value : number;

    /**
     * @constructor
     * @param {string} type type of data the value described
     * @param {string} format size type of the value encapsulated in the segment
     * @param {number} value data encapsulated in the segment
     */
    constructor(type:string, format:LogicalFormatKey, value:number) {
      super('LOGICAL');
      this._type = type;
      this._format = format;
      this._value = value;
    }


    /**
     * Get the size of the value ecapsulated in bytes
     * @return {number} value size in byte
     */
    get dataSize() : number {
      return this._format ? LogicalFormat.getSize(this._format) : 0;
    }

    /**
     * Parse buffer
     * @param {Buffer} metaBuffer metadata buffer
     */
    public parseMeta(metaBuffer : Buffer): void {
      const ltcode :number = BitVector.fromArray(_.clone(metaBuffer))
          .clearRange(0, 1)
          .clearRange(5, 7)
          .bitVector[0] >>> 2;

      const lfcode : number = BitVector.fromArray(_.clone(metaBuffer))
          .clearRange(2, 7)
          .bitVector[0];

      const type = LogicalType[ltcode];
      if (type == undefined) {
        // eslint-disable-next-line max-len
        throw new Error(`ERROR: The logical segment format <${ltcode}> is not a available logical segment format`);
      }

      const format = LogicalFormat.getType(lfcode);
      if (format == undefined) {
        // eslint-disable-next-line max-len
        throw new Error(`ERROR: The logical segment format <${lfcode}> is not a available logical segment format`);
      }

      this._format = format;
      this._type = type;
    }

    /**
     * @param {Buffer} dataBuffer
     */
    public parseData(dataBuffer:Buffer):void {
      if (this._format) {
        this._value = LogicalFormat.getValue(dataBuffer, this._format);
      }
    }

    /**
     * Initialize the segment
     * @param {Buffer} metaBuffer
     * @return {LogicalSegment} the logical segment
     */
    public static initialize(metaBuffer:Buffer): LogicalSegment {
      const lsegment = new LogicalSegment('', '', 0);
      lsegment.parseMeta(metaBuffer);
      return lsegment;
    }
}
