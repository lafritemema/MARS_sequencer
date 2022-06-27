import {Action} from '../build_processor/interfaces';
import {RequestBody} from './interfaces';

/**
 * function to build a cmd gen request body from build processor action
 * @param {Action} action : build processor action
 * @return {RequestBody} : the request body
 */
export function buildBodyFromAction(action:Action):RequestBody {
  return {
    uid: action.uid,
  };
}
