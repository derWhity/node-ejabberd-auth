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

