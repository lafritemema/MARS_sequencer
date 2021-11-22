import chalk from 'chalk';

const Level:Record<string, (msg:string)=>void>= {
  'INFO': chalk.white,
  'WARNING': chalk.yellow,
  'ERROR': chalk.bold.red,
  'DEBUG': chalk.bold.cyan,
  'SUCCESS': chalk.green,
};


/**
 * Class to log messages
 */
export default class Logger {
  /**
   * Log info message
   * @param {string} message message to log
   */
  public info(message:string):void {
    const mes = buildMessage('INFO', message);
    console.info(mes);
    // console.info(timestamp(), this._info(message));
  }

  /**
   * Log try message
   * @param {string} message message to log
   */
  public try(message:string):void {
    const mes = buildMessage('INFO', message);
    process.stdout.write(mes + ' ... \r');
  }

  /**
   * Log warning message
   * @param {string} message message to log
   */
  public warn(message:string):void {
    const mes = buildMessage('WARNING', message);
    console.warn(mes);
  }

  /**
   * Log error message
   * @param {string} message message to log
   */
  public error(message:string):void {
    const mes = buildMessage('ERROR', message);
    console.error(mes);
  }

  /**
   * Log success message
   * @param {string} message message to log
   */
  public success(message:string):void {
    const mes = buildMessage('INFO', message);
    console.info(mes + Level['SUCCESS'](' SUCCESS'));
  }

  /**
   * log failure message
   * @param {string} message message to log
   */
  public failure(message:string):void {
    const mes = buildMessage('INFO', message);
    console.info(mes + Level['ERROR'](' FAILURE'));
  }

  /**
   * log debug message
   * @param {string} message resolution message
   */
  public debug(message:string):void {
    const mes = buildMessage('DEBUG', message);
    console.info(mes);
  }
}

/**
 * Build the logger message
 * @param {string} level message level
 * @param {string} message main message
 * @return {string} builded message
 */
function buildMessage(level:string, message:string):string {
  const msg = Level[level](`[${level}] - ${message}`);
  return `${new Date().toLocaleString()} - ${msg}`;
}
