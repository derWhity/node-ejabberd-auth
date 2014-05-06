/*
 * index.js: Main module include for ejabberd-auth
 *
 * (C) 2014 Stefan Westphal
 * MIT LICENCE
 *
 */

var winston = require('winston');
var _ = require('lodash');

// Stdin and stdout for easier use
var stdin = process.stdin;
var stdout = process.stdout;

/**
 * Contains all registered commands as <command> => <function> map
 * whereas <command> is a command string, ejabberd may send.
 *
 * Currently the following command strings may be received by ejabberd:
 *
 * - isuser => function(callback, userName, domain): Check, if the given user exists
 * - auth => function(): Authenticate a user
 * - setpass => function(): Set a new password for the given user
 *
 * All functions may either return true or false, depending on their result.
 * To do so, just call the callback with either true, false or an error.
 *
 * If the authenticator recieves a command which is not registered here, false
 * will be returned to the ejabberd server.
 *
 * @type {Object}
 */
var registeredActions = {};

//-- Helper functions -----------------------------------------------------------------------------

function handleIncomingData(data) {
    winston.debug('Incoming data via stdin');
    var len = data.readUInt16BE(0);
    winston.debug('Data length is reported as: ' + len);
    // TODO: Better buffer handling
    if (data.length -2 === len) {
        //Read the data from the buffer
        var parts = data.toString('utf8', 2, len+2).split(':');
        if (parts.length > 1) {
            var cmd = parts.shift();
            // Add sendResult as callback to the front of the parameters
            parts.unshift(sendResult);
            if (registeredActions[cmd]) {
                registeredActions[cmd].apply(this, parts);
            } else {
                winston.error('Unknown action "' + cmd + '" requested by ejabberd');
                sendResult(false);
            }
        } else {
            winston.error('Illegal parameter count');
            sendResult(false);
        }
    } else {
        winston.error('Buffer length does not match the reported length.');
        sendResult(false);
    }
}

/**
 * Sends true or false back to the calling process via stdout
 *
 * @param  {Boolean/Object} result The result to send
 */
function sendResult(result) {
    var data = result === true ? 0x1 : 0x0;
    if (result && result !== true) {
        // An error may be returned - log it
        winston.error('Action returned an error', result);
    }
    winston.debug('Sending result to stdout: ' + data);
    var outBuf = new Buffer(4);
    outBuf.writeUInt16BE(0x2, 0);
    outBuf.writeUInt16BE(data, 2);
    stdout.write(outBuf);
}

//-- Main export ----------------------------------------------------------------------------------

/**
 * This function is exported as module's only API.
 * Calling it results in the authenticator listening to incoming requests from ejabberd
 * on stdin, handing over the decoded requests to the function registered for requested
 * the action and returning the result to ejabberd via stdout.
 *
 * The configuration object may contain the following properties:
 *
 * {
 *     // Logging configuration for winston - it will be handed as config to winston.add()
 *     // See winston's documentation for further details
 *     log: {
 *         filename: '/path/to/logfile',
 *         level: 'desiredLogLevel'
 *     },
 *     // Actions that may be requested by ejabberd.
 *     // If an action is requested which is not stated here, false will be returned to ejabberd.
 *     //
 *     // The typical actions are the following (with their method signature):
 *     actions: {
 *         // Called when a user tries to log-in.
 *         // Pass true to the callback to approve the login
 *         auth: function(callback, userName, domainName, password) {
 *             // Do some authentication magic here
 *         },
 *         // Called when ejabberd checks for the existance of a user
 *         // Pass true if the user exists, false if not
 *         isuser: function(callback, userName) {
 *             // Check if the user exists
 *         },
 *         // Called when the user tries to change his password
 *         // Upon success, pass true to the callback
 *         setpass: function(callback) {
 *             // Use some magical things to change the password
 *         }
 *     }
 * }
 *
 * @param  {Object} config An object to configure the authenticator
 */
function run(config) {
    // Configure the logger
    if (config && config.log && config.log.filename) {
        winston.add(winston.transports.File, config.log);
    }
    // Remove the console transport, since stdout will be used by ejabberd to receive responses
    winston.remove(winston.transports.Console);

    // Register the actions
    if (config && _.isObject(config.actions)) {
        _.forIn(config.actions, function(fn, action) {
            if (_.isFunction(fn)) {
                registeredActions[action] = fn;
            }
        });
    }

    // Register the event listeners for handling requests
    stdin.on('data', handleIncomingData);

    process.on('exit', function() {
        logger.info('Auth process is shutting down.');
    });

    // Catch exceptions to log them - debugging errors will be a lot harder if this is not
    // done, since ejabberd just tells us that the external script has crashed.
    process.on('uncaughtException', function(err) {
        logger.error('Uncaught exception' + err.toString());
        // Rethrow the exception
        throw err;
    });
}

// Export our run function
exports.run = run;
exports.logger = winston;