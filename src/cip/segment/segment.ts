
// import * as _ from 'lodash';

import {TypeKeys} from './segment_type';

/**
 * @class Segment
 * @abstract
 */
export abstract class Segment {
    private _stype:TypeKeys;
    /**
     * test
     * @param {SegmentTypeKeys} stype test
     */
    protected constructor(stype:TypeKeys) {
      this._stype = stype;
    }
    public abstract get dataSize():number;
    public abstract parseMeta(metaBuffer:Buffer):void;
    public abstract parseData(dataBuffer:Buffer):void;
    // @ts-ignore
    public static abstract initialise(metaBuffer:Buffer):Segment;
}


