/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { FILE_EXT } from './types/generator-types';
import * as https from 'https';
import * as validUrl from 'valid-url';


export class FileManager {

    /**@private  path to file*/
    private pathToFile: string;

    /**@private parsed path object */
    private pathObject: path.ParsedPath;

    constructor( pathToFile: string ) {
        this.pathToFile = pathToFile;
        this.parsePath();
    }


    /**
     * Write new file to filesystem
     * @param filePath specify path to new file
     * @param data content of new file
     */
    static writeFile( filePath: string, data: string ): void {
        mkdirp( path.dirname( filePath ), ( err ) => {
            if ( err ) {
                console.log( err );
            }
            fs.writeFile( filePath, data, ( error ) => {
                if ( error ) {
                    console.log( error );
                }
            } );
        } );
    }

    /**
     * Check if file exist
     */
    fileExists(): boolean {
        return fs.existsSync( this.pathToFile );
    }

    /**
     * Check if file is different from file specified as parameter
     * @param file to compare with
     */
    isDiff( file: FileManager ): Promise<boolean> {
        return new Promise( ( resolve, reject ) => {
            Promise.all( [this.readFile(), file.readFile()] )
                .then( ( contents ) => {
                    const isDiff = contents[0] !== contents[1];
                    resolve( isDiff );
                }, ( err ) => {
                    reject( err );
                } );
        } );
    }

    /**
     * @returns name of lock file based on filename
     */
    getSpecLockFileName(): string {
        let specLockFile: string;
        if ( this.pathObject.ext === FILE_EXT.JSON
            || this.pathObject.ext === FILE_EXT.YAML
            || this.pathObject.ext === FILE_EXT.WADL ) {
            specLockFile = this.pathObject.name + FILE_EXT.LOCK + this.pathObject.ext;
        } else {
            console.error( 'Unsupported specification file format.' );
            process.exit( 1 );
        }
        return specLockFile;
    }

    /**
     * Create copy of file 
     * @param destinationFile specify path to new file
     */
    createCopy( destinationFile: string ): void {
        if ( !this.isLocalFile() ) {
            this.fetchFile()
                .then( data => FileManager.writeFile( destinationFile, data ) )
                .catch( error => console.log( error ) );
        }
        else {
            fs.copyFile( this.pathToFile, destinationFile, ( err ) => {
                if ( err ) {
                    console.error( `Error occured while creating ${ destinationFile } file.` );
                }
                console.log( `${ destinationFile } file has been created.` );
            } );
        }
    }


    /**
     * Read file content
     * @returns file content
     */
    readFile(): Promise<string> {
        return new Promise<string>( ( resolve, reject ) => {
            if ( !this.isLocalFile() ) {
                this.fetchFile()
                    .then( data => resolve( data ) )
                    .catch( error => reject( error ) );
            } else {
                fs.readFile( this.getFormatedPath(), 'utf8', ( err, data ) => {
                    if ( err ) {
                        reject( err );
                    } else {
                        resolve( data.toString() );
                    }
                } );
            }
        } );
    }

    /**
     * Fetch file from remote host
     * @returns file content
     */
    fetchFile(): Promise<string> {
        return new Promise<string>( ( resolve, reject ) => {
            https.get( this.pathToFile, ( res ) => {
                const { statusCode } = res;

                if ( statusCode !== 200 ) {
                    const error = new Error( 'Request Failed.\n' +
                        `Status Code: ${ statusCode }` );
                    console.error( error.message );
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }

                res.setEncoding( 'utf8' );
                let rawData = '';
                res.on( 'data', ( chunk ) => { rawData += chunk; } );
                res.on( 'end', () => {
                    resolve( rawData );
                } );
            } ).on( 'error', ( e ) => {
                console.error( `Got error: ${ e.message }` );
                reject( e );
            } );
        } );
    }

    /**
     * Check if file is in local filesystem
     */
    isLocalFile(): boolean {
        return !validUrl.isWebUri( this.pathToFile );
    }

    /**
     * @returns  path to file
     */
    getPathToFile(): string {
        return this.pathToFile;
    }

    /**
     * Parse path to file into path object
     */
    parsePath(): void {
        this.pathObject = path.parse( this.pathToFile );
    }

    /**
     * @returns formated path object
     */
    getFormatedPath(): string {
        return path.format( this.pathObject );
    }

    /**
     * @returns file extension
     */
    getExt(): string {
        return this.pathObject.ext;
    }

    /**
     * @returns file root
     */
    getRoot(): string {
        return this.pathObject.root;
    }

    /**
     * @returns file directory
     */
    getDir(): string {
        return this.pathObject.dir;
    }

    /**
     * @returns file base
     */
    getBase(): string {
        return this.pathObject.base;
    }

    /**
     * @returns file name
     */
    getName(): string {
        return this.pathObject.name;
    }

    /**
     * Set file directory
     */
    setDir( dir: string ) {
        this.pathObject.dir = dir;
    }
}
