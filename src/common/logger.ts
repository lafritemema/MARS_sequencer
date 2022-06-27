import chalk from 'chalk';

const LEVEL:Record<string, chalk.Chalk> = {
  INFO: chalk.white,
  WARNING: chalk.yellow,
  ERROR: chalk.bold.red,
  DEBUG: chalk.bold.cyan,
  SUCCESS: chalk.green,
};


/**
 * Class to log messages
 */
export default class Logger {
  private _origin:string

  /**
   * logger constructor
   * @param {string} origin : origin of the message
   */
  public constructor(origin:string) {
    this._origin = origin;
  }
  /**
   * Log info message
   * @param {string} message message to log
   */
  public info(message:string):void {
    const mes = this.buildMessage('INFO', message);
    console.info(mes);
    // console.info(timestamp(), this._info(message));
  }

  /**
   * Log try message
   * @param {string} message message to log
   */
  public try(message:string):void {
    const mes = this.buildMessage('INFO', message);
    process.stdout.write(mes + ' ... \r');
  }

  /**
   * Log warning message
   * @param {string} message message to log
   */
  public warn(message:string):void {
    const mes = this.buildMessage('WARNING', message);
    console.warn(mes);
  }

  /**
   * Log error message
   * @param {string} message message to log
   */
  public error(message:string):void {
    const mes = this.buildMessage('ERROR', message);
    console.error(mes);
  }

  /**
   * Log success message
   * @param {string} message message to log
   */
  public success(message:string):void {
    const mes = this.buildMessage('INFO', message);
    // eslint-disable-next-line new-cap
    console.info(mes + LEVEL.SUCCESS(' SUCCESS'));
  }

  /**
   * log failure message
   * @param {string} message message to log
   */
  public failure(message:string):void {
    const mes = this.buildMessage('INFO', message);
    // eslint-disable-next-line new-cap
    console.info(mes + LEVEL.ERROR(' FAILURE'));
  }

  /**
   * log debug message
   * @param {string} message resolution message
   */
  public debug(message:string):void {
    const mes = this.buildMessage('DEBUG', message);
    console.info(mes);
  }

  /**
 * Build the logger message
 * @param {string} level message level
 * @param {string} message main message
 * @return {string} builded message
 */
  private buildMessage(level:string, message:string):string {
    const cfunction = LEVEL[level];
    const msg = cfunction(`${this._origin} - ${level} - ${message}`);
    return `${new Date().toLocaleString()} - ${msg}`;
  }
}
