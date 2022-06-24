/* eslint-disable no-unused-vars */
import {ExceptionDescription} from './interfaces';

export enum BaseExceptionType {
  CONFIG_NOT_CONFORM = 'CONFIG_NOT_CONFORM',
  CONFIG_MISSING = 'CONFIG_MISSING'
}

/**
 * class representin
 */
export class BaseException {
  private _originStack:string[]
  private _type:string
  private _description:string

  /**
   * BaseException constructor
   * @param {string[]} originStack : list of string describing the error origin
   * @param {ExceptionType} type : error type
   * @param {string} description : description of the error
   */
  public constructor(originStack:string[],
      type:string,
      description:string) {
    this._originStack = originStack;
    this._type = type;
    this._description = description;
  }

  /**
   * fonction to add new element in exception stack
   * @param {string[]} newStack : element to add
   */
  public addInStack(newStack:string[]) {
    this._originStack = newStack.concat(this._originStack);
  }

  /**
   * fonction to return the error description
   * @return {ExceptionDescription}
   */
  public describe() {
    const description:ExceptionDescription = {
      origin: this._originStack.join('.'),
      default: this._type.toString(),
      description: this._description,
    };
    return description;
  }
}
