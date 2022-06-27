import {CommandDefinition} from '../interfaces';

export interface ProxyCommandDefinition extends CommandDefinition{
  method:'GET'|'PUT'|'SUBSCRIBE',
}
