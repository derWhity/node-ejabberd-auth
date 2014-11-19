# node-ejabberd-auth

A simple Node.js module you can use to build you own external ejabberd auth with

## Installation

``` bash
npm install ejabberd-auth
```

## Usage

To create your own external authentication script for ejabberd, simply require ejabberd-auth
and call the run() method exported by this module while passing your authentification function
to it.

``` js
require('ejabberd-auth').run({
    actions: {
        auth: function(done, userName, domain, password) {
            // Some auth to be done here
            done(true); // or done(false) if the authentification has failed
        }
    }
});
```

run() takes a configuration object. It takes the following options:

* __log:__ Configuration for the Winston File transport used for logging (refer the [winston documentation](https://github.com/flatiron/winston/blob/master/docs/transports.md#file-transport) for more details). If no _log_ configuration or _filename_ is given, logging will be disabled.
* __actions:__ An object containing callback functions for the module to call, when ejabberd requests an action. Possible keys are:
	* ___auth:___ Called, when a user tries to log in. Call the callback with _true_ to allow the user to enter.  
```
auth: function(callback, userName, domainName, password)
```
 	* ___isuser:___ Called, when ejabberd needs to check, if a JID exists.  
```
isuser: function(callback, userName)
```
	* ___setpass:___ Called, when a user tries to change his password. Change the password and call the callback with _true_, to signalize, that the password was successfully changed.
```
setpass: function(callback)
```

If any of the action key is not given, _false_ will be returned to ejabberd.