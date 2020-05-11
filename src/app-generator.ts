/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/
import { Generator } from './generator';
import { FileManager } from './file-manager';
import * as yargs from 'yargs';
import { OpenapiParser } from './openapi-parser';
import { IParser, FILE_EXT, IGeneratorConfig } from './types/generator-types';
import { WadlParser } from './wadl-parser';
import { SpecificationObject } from './types/specification-types';
import { timingSafeEqual } from 'crypto';

/**
 * Main class
 */
export class AppGenerator {

    /**@private program arguments */
    private argv: any;

    /**@private configuration file manager */
    private configFileManager: FileManager;

    /**@private specification file manager */
    private specFileManager: FileManager;

    /**@private configuration for generator */
    private generatorConfig: IGeneratorConfig;

    /**
     * Program arguments parsing
     * @throws Will throw an error if argument to determine configuration file is not specified.
     * @private
     */
    private parseArguments(): void {
        this.argv = yargs
            .command( 'config', 'Path to configuration file for generator', {
                path: {
                    description: 'path to configuration file',
                    alias: 'c',
                    type: 'string',
                }
            } )
            .command( 'apispec', 'Path to REST API specification file for generator', {
                path: {
                    description: 'path to REST API specification file',
                    alias: 'a',
                    type: 'string',
                }
            } )
            .option( 'force', {
                alias: 'f',
                description: 'Force generate client even configuration file does not changed',
                type: 'boolean',
            } )
            .help( 'h' )
            .alias( 'h', 'help' )
            .argv;

        if ( !this.argv.config && !this.argv.apispec ) {
            throw new Error( `Use --apispec to specify specification file or --config to specify configuration file with 'apiSpec' field` );
        }

        if ( this.argv.config && typeof ( this.argv.config ) === 'string' ) {
            this.configFileManager = new FileManager( this.argv.config );
        }

        if ( this.argv.apispec && typeof ( this.argv.apispec ) === 'string' ) {
            this.specFileManager = new FileManager( this.argv.apispec );
        }

        if ( this.configFileManager && !this.configFileManager.fileExists() ) {
            throw new Error( `Configuration file ${ this.configFileManager.getPathToFile() } not found.` );
        }
    }

    /**
     * Method reads configuration file and create file manager instance
     * for specification file if configuration is valid.
     * Promise is resolved when specFileManager is set.
     * @throws Will return error if configuration file is not valid JSON 
     *  or specification file is not provided or does not exists.
     * @private
     */
    private parseConfigurationFile(): Promise<boolean> {
        return new Promise<boolean>( ( resolve ) => {
            this.configFileManager.readFile()
                .then( ( data: string ) => {
                    try {
                        this.generatorConfig = JSON.parse( data );
                    } catch ( error ) {
                        throw new Error( 'Failed to parse configuration file: ' + error );
                    }
                    if ( this.specFileManager ) {
                        resolve();
                    }
                    if ( !this.generatorConfig.apiSpec ) {
                        throw new Error( `Configuration file does not contain API specification: apiSpec field is required!` );
                    }
                    this.specFileManager = new FileManager( this.generatorConfig.apiSpec );
                    if ( !this.specFileManager.isLocalFile() ) {
                        resolve();
                    }
                    this.specFileManager.setDir( this.configFileManager.getDir() + '/' + this.specFileManager.getDir() );
                    if ( !this.specFileManager.fileExists() ) {
                        throw new Error( `Error: Specification file not found.` );
                    }
                    resolve();
                } );
        } );
    }

    /**
     * Method check if specification file exist.
     * Calls function for parsing specification file.
     * Create specification lock file if he does not exist. 
     * @throws Will return error if specification file does not exist.
     * @private
     */
    private processOutputRegeneration(): void {
        let specLockFile = this.specFileManager.getSpecLockFileName();
        const specLockFileManager = new FileManager( './' + specLockFile );
        if ( specLockFileManager.fileExists() ) {
            this.specFileManager.isDiff( specLockFileManager )
                .then( ( isDifferent ) => {
                    if ( isDifferent || this.argv.force || ( this.generatorConfig && this.generatorConfig.forceGeneration ) ) { // specification file has changed => client needs to be regenerated & lock file updated
                        console.log( isDifferent ? 'Specification file has changed' : 'Force option provided' );
                        this.parseAndGenerate();
                        this.specFileManager.createCopy( specLockFileManager.getPathToFile() );
                    } else {
                        //nothing - client library is up to date
                        console.log( 'Specification does not changed. Generated files should be up to date.' );
                    }
                } );
        } else { // lock file does not exist => client has not been generated yet => generate client & make lock file
            console.log( 'Specification lock file does not exist.' );
            this.parseAndGenerate();
            this.specFileManager.createCopy( specLockFileManager.getPathToFile() );
        }
    }

    /**
     * Parse specification file and create 
     * and use generator for generating output.
     * @throws Will throw error if genreation ends unexpectedly.
     */
    private parseAndGenerate(): void {
        const parser = this.getParser();
        parser.getParsed()
            .then( ( specification: SpecificationObject ) => {
                const generator = new Generator( specification, this.generatorConfig );
                generator.generate();
            } )
            .catch( err => { throw new Error( err ); } );
    }

    /**
     * Check specification file format and returns right parser based on file format.
     * @return instance of parser.
     * @throws Will throw error for unsupported specification file format.
     * @param specFileManager 
     */
    private getParser(): IParser {
        if ( this.specFileManager.getExt() === FILE_EXT.JSON ||
            this.specFileManager.getExt() === FILE_EXT.YAML ) {
            return new OpenapiParser( this.specFileManager );
        } else if ( this.specFileManager.getExt() === FILE_EXT.WADL ) {
            return new WadlParser( this.specFileManager );
        } else {
            throw new Error( `Unsupported specification file format ${ this.specFileManager.getExt() }.` );
        }
    }

    /**
     * Main program flow
     * Parse arguments
     * Parse configuration file if file is provided
     * Call generation method
     * @throws Will throw error if unexpected error is occured
     */
    start(): void {
        try {
            console.log( 'application starting' );
            this.parseArguments();
            if ( this.configFileManager ) {
                this.parseConfigurationFile().then( () =>
                    this.processOutputRegeneration() );
            } else {
                this.processOutputRegeneration();
            }

        } catch ( error ) {
            console.error( error );
        }
    }
}




