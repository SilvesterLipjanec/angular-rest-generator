#!/usr/bin/env node

import { AppGenerator } from "./app-generator";

/**
 * Main node.js program
 * Create instance of application and run main program flow
 */
new AppGenerator().start();

/**
 * Will print error on unhandled rejection.
 */
process.on( 'unhandledRejection', ( error: Error ) => {
    // Will print "unhandledRejection err is not defined"
    console.error( 'unhandledRejection', error.message );
} );