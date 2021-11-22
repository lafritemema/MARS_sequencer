"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const Level = {
    'INFO': chalk_1.default.white,
    'WARNING': chalk_1.default.yellow,
    'ERROR': chalk_1.default.bold.red,
    'DEBUG': chalk_1.default.bold.cyan,
    'SUCCESS': chalk_1.default.green,
};
/**
 * Class to log messages
 */
class Logger {
    /**
     * Log info message
     * @param {string} message message to log
     */
    info(message) {
        const mes = buildMessage('INFO', message);
        console.info(mes);
        // console.info(timestamp(), this._info(message));
    }
    /**
     * Log try message
     * @param {string} message message to log
     */
    try(message) {
        const mes = buildMessage('INFO', message);
        process.stdout.write(mes + ' ... \r');
    }
    /**
     * Log warning message
     * @param {string} message message to log
     */
    warn(message) {
        const mes = buildMessage('WARNING', message);
        console.warn(mes);
    }
    /**
     * Log error message
     * @param {string} message message to log
     */
    error(message) {
        const mes = buildMessage('ERROR', message);
        console.error(mes);
    }
    /**
     * Log success message
     * @param {string} message message to log
     */
    success(message) {
        const mes = buildMessage('INFO', message);
        console.info(mes + Level['SUCCESS'](' SUCCESS'));
    }
    /**
     * log failure message
     * @param {string} message message to log
     */
    failure(message) {
        const mes = buildMessage('INFO', message);
        console.info(mes + Level['ERROR'](' FAILURE'));
    }
    /**
     * log debug message
     * @param {string} message resolution message
     */
    debug(message) {
        const mes = buildMessage('DEBUG', message);
        console.info(mes);
    }
}
exports.default = Logger;
/**
 * Build the logger message
 * @param {string} level message level
 * @param {string} message main message
 * @return {string} builded message
 */
function buildMessage(level, message) {
    const msg = Level[level](`[${level}] - ${message}`);
    return `${new Date().toLocaleString()} - ${msg}`;
}
