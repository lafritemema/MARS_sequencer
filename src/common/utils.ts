
import {parse, YAMLParseError} from 'yaml';
import {readFile} from 'fs/promises';
import {Configuration} from './interfaces';
import {BaseException,
  BaseExceptionType} from './exceptions';

/**
 * fonction to read configuration from yaml file
 * and return config object
 * @param {string} yamlFile : yaml file containing the configuration
 * @return {Configuration} configuration
 */
export async function getConfigFromYaml<ConfigType extends
  Configuration>(yamlFile:string):Promise<ConfigType> {
  try {
    const yamlContent = await readFile(yamlFile);
    const configStr = yamlContent.toString('utf-8');
    const configObject = parse(configStr);
    return <ConfigType>configObject;
  } catch (error) {
    let type = null;
    let msg = null;
    if (error instanceof YAMLParseError) {
      type = BaseExceptionType.CONFIG_NOT_CONFORM;
      msg = `configuration file ${yamlFile} is not under yaml format
      ${error.message}`;
    } else {
      type = BaseExceptionType.CONFIG_MISSING;
      msg = `The configuration file ${yamlFile} not found.`;
    }
    throw new BaseException(['CONFIG'],
        type,
        msg);
  }
}
