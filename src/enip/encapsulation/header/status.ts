const _status:any = {
  0x00: {state: !0, code: 0x00,
    message: 'SUCCESS'},
  0x01: {state: !1, code: 0x01,
    message: 'FAIL: Sender issued an invalid ecapsulation command.'},
  0x02: {state: !1, code: 0x02,
    message: 'FAIL: Insufficient memory resources to handle command.'},
  0x03: {state: !1, code: 0x03,
    message: 'FAIL: Poorly formed or incorrect data in encapsulation packet.'},
  0x64: {state: !1, code: 0x64,
    message: 'FAIL: Originator used an invalid session handle.'},
  0x65: {state: !1, code: 0x65,
    message: 'FAIL: Target received a message of invalid length.'},
  0x69: {state: !1, code: 0x69,
    message: 'FAIL: Unsupported encapsulation protocol revision.'},
};

/**
 * @class Status
 *
 * @property {number} TypeID
 */
class Status {
    private _state:boolean;
    private _code:number;
    private _message:string;

    private constructor(state:boolean, code:number, msg:string) {
      this._state = state;
      this._code = code;
      this._message = msg;
    }

    /**
     * Parse a code and return a status instance describing the request status
     * @param scode {number} status code define in enip
     * @return {Status} status instance describing the request status
     */
    public static parse(scode:number) : Status {
      if (scode in _status) {
        const {state, code, message} = _status[scode];
        return new Status(state, code, message);
      } else {
        return new Status(!1, scode, `FAIL: Unknow failure with code <${scode}> occured.`);
      }
    }

    public get state(): boolean {
      return this._state;
    }

    public get code():number {
      return this._code;
    }

    public get message():string {
      return this._message;
    }
}

export {Status};
