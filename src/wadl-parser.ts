/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/
import { IParser } from './types/generator-types';
import { FileManager } from './file-manager';
import * as xml2js from 'xml2js';
import * as xml2jsFunc from 'xml2js/lib/processors.js'
import * as xpath from 'xml2js-xpath';
import { SpecificationObject, PropertyObject, ComplexType, EnumType } from './types/specification-types';
import { ElementObject, ComplexTypeObject, ValueObject, SimpleTypeObject } from './types/schema-definition-types';

export class WadlParser implements IParser {

    /**@private  wadl namespace*/
    private wadlXmlns: string;

    /**@private  xsd namespace*/
    private xsdXmlns: string;

    /**@private  xsd namespace prefix*/
    private xsdNsPrefix: string;

    /**@private options for xml2js converter */
    private xml2jsOptions = {
        explicitArray: false,
        xmlns: true,
        tagNameProcessors: [xml2jsFunc.stripPrefix]
    }

    /**@private specification file manager */
    private specFileManager: FileManager;

    /**@private xsd file manager */
    private xsdFileManager: FileManager;

    constructor( specFileManager: FileManager ) {
        this.specFileManager = specFileManager;
    }

    /**
     * Method parse specification file and
     * @returns norm specification to be used for generator
     */
    getParsed(): Promise<SpecificationObject> {
        return new Promise( ( resolve, reject ) => {
            this.specFileManager.readFile()
                .then( ( apiSpecData: string ) => {
                    xml2js.parseStringPromise( apiSpecData, this.xml2jsOptions )
                        .then( parsedSpec => {
                            this.getSpecificationObject( parsedSpec )
                                .then( specificationObject => resolve( specificationObject ) );
                            console.log( 'Done' );
                        } )
                        .catch( function ( err ) {
                            console.log( err );
                        } );
                } );
        } );
    }

    private getObjectProperty( arr: string[], object: any ) {
        if ( arr.length === 0 ) return object;
        const attr = arr.shift();
        if ( attr in object ) {
            return this.getObjectProperty( arr, object[attr] );
        }
        return undefined;
    }

    private getObjectPropertyValue( arr: string[], object: any ) {
        const attr = this.getObjectProperty( arr, object );
        return attr ? ( 'value' in attr ? attr.value : undefined ) : undefined;
    }

    private getSpecificationObject( parsedSpec: any ): Promise<SpecificationObject> {
        return new Promise( ( resolve, reject ) => {
            const applicationObject = xpath.evalFirst( parsedSpec, '//application' );
            this.wadlXmlns = this.getObjectProperty( ['$ns', 'uri'], applicationObject );

            const includeObjects = this.findInNamespace( parsedSpec, "//application/grammars/include", this.wadlXmlns );
            includeObjects.map( includeObject => {
                const href = this.getObjectPropertyValue( ['$', 'href'], includeObject );
                this.xsdFileManager = new FileManager( href );
                if ( this.xsdFileManager.getDir() === "" ) {
                    this.xsdFileManager.setDir( this.specFileManager.getDir() )
                    this.parseXsdFile()
                        .then( specificationObject => resolve( specificationObject ) );
                }
            } );
        } );
    }

    private parseXsdFile(): Promise<SpecificationObject> {
        return new Promise( ( resolve, reject ) => {
            this.xsdFileManager.readFile()
                .then( xsdData => {
                    xml2js.parseStringPromise( xsdData, this.xml2jsOptions )
                        .then( parsedXsd => {
                            const schemaObject = xpath.evalFirst( parsedXsd, '//schema' );
                            this.xsdXmlns = this.getObjectProperty( ['$ns', 'uri'], schemaObject );
                            this.xsdNsPrefix = this.getNsPrefix( schemaObject );
                            const elementObjects = this.findInNamespace( schemaObject, '/element', this.xsdXmlns );
                            const complexTypeObjects = this.findInNamespace( schemaObject, "/complexType", this.xsdXmlns );
                            const simpleTypeObjects = this.findInNamespace( schemaObject, "/simpleType", this.xsdXmlns );
                            const elementSpec = this.parseElements( elementObjects );

                            resolve( {
                                complexTypes: this.parseComplexTypes( complexTypeObjects ).concat( elementSpec.complexTypes ),
                                enumTypes: this.parseSimpleTypes( simpleTypeObjects ),
                                models: elementSpec.models
                            } );
                        } )
                        .catch( function ( err ) {
                            console.log( err );
                        } );
                } );
        } );
    }

    private parseElements( elements: ElementObject[] ): SpecificationObject {

        let complexTypes: ComplexType[] = [];
        const models = elements.map( element => {
            const elementType = this.getObjectPropertyValue( ['$', 'type'], element );
            let typeName;
            if ( elementType ) {
                typeName = this.parseType( elementType );
            } else {
                const complexTypeObjects = this.findInNamespace( element, '/complexType', this.xsdXmlns );
                typeName = this.getObjectPropertyValue( ['$', 'name'], element );
                complexTypes = complexTypes.concat( this.parseComplexTypes( complexTypeObjects, typeName ) );
            }
            return {
                name: this.getObjectPropertyValue( ['$', 'name'], element ),
                type: typeName
            };
        } );
        return {
            models: models,
            complexTypes: complexTypes,
        };
    }

    private findFirstInNamespace( object: any, expr: string, ns: string ): Object {
        const found = this.findInNamespace( object, expr, ns );
        return found.length > 0 ? found[0] : null;
    }

    private parseSimpleTypes( simpleTypes: SimpleTypeObject[] ): EnumType[] {
        return simpleTypes.map( ( simpleType ): EnumType => {
            const enumObjects = this.findInNamespace( simpleType, "/restriction/enumeration", this.xsdXmlns );
            return {
                name: this.getObjectPropertyValue( ['$', 'name'], simpleType ),
                values: enumObjects.map( ( enumObject, idx ) => ( {
                    value: this.getObjectPropertyValue( ['$', 'value'], enumObject ),
                    last: idx === ( enumObjects.length - 1 )
                } ) )
            };
        } )
    }

    private getNsPrefix( object: any ): string {
        const attrs = this.getObjectProperty( ['$'], object );
        if ( !attrs ) return null;
        const key = Object.keys( attrs )
            .find( key => {
                const attrValObj = attrs[key] as ValueObject;
                return attrValObj.prefix === 'xmlns' && attrValObj.value === this.xsdXmlns;
            } );
        return key ? ( attrs[key] as ValueObject ).local : '';
    }

    private parseComplexTypes( complexTypes: ComplexTypeObject[], parentName?: string ): ComplexType[] {
        return complexTypes.map( ( complexType ): ComplexType => {
            var extendsName: string;
            let elements: ElementObject[];
            let object: any;

            const extension = this.getObjectProperty( ['complexContent', 'extension'], complexType );
            const restriction = this.getObjectProperty( ['complexContent', 'restriction'], complexType );

            if ( extension ) {
                object = extension;
                extendsName = this.getObjectPropertyValue( ['$', 'base'], extension );
            } else if ( restriction ) {
                object = restriction;
                extendsName = this.getObjectPropertyValue( ['$', 'base'], restriction );
            } else {
                object = complexType;
            }

            elements = this.findInNamespace( object, '/sequence/element', this.xsdXmlns );

            return {
                name: parentName ?
                    parentName : this.getObjectPropertyValue( ['$', 'name'], complexType ),
                properties: elements.map( ( element ): PropertyObject => (
                    {
                        name: this.getObjectPropertyValue( ['$', 'name'], element ),
                        type: restriction ? 'never' : this.parseType( this.getObjectPropertyValue( ['$', 'type'], element ) ),
                        required: this.getObjectPropertyValue( ['$', 'nillable'], element ) === "true" ? false : true,
                        isSimple: true
                    } )
                ),
                extending: extendsName
            }
        } );
    }



    private parseType( type: string ): string {
        const nsRe = '[^:]*:';
        const match = type.match( nsRe );
        const typeNs = match ? match[0] : null;
        if ( typeNs && typeNs.slice( 0, -1 ) === this.xsdNsPrefix ) {
            type = type.replace( typeNs, '' );
            return this.getTsType( type );
        }
        return type;
    }

    private getTsType( type: string ): string {
        switch ( type ) {
            case 'language':
            case 'normalizedString':
            case 'string':
            case 'token':
                return 'string';
            case 'date':
            case 'dateTime':
            case 'duration':
            case 'gDay':
            case 'gMonth':
            case 'gMonthDay':
            case 'gYear':
            case 'gYearMonth':
            case 'time':
                return 'Date'
            case 'byte':
            case 'decimal':
            case 'int':
            case 'integer':
            case 'long':
            case 'negativeInteger':
            case 'nonNegativeInteger':
            case 'nonPositiveInteger':
            case 'positiveInteger':
            case 'short':
            case 'unsignedLong':
            case 'unsignedInt':
            case 'unsignedShort':
            case 'unsignedByte':
                return 'number';
            case 'boolean':
                return 'boolean';
            default: return 'Object';
        }
    }


    private flatDeep( arr, d = 1 ) {
        return d > 0 ? arr.reduce( ( acc, val ) => acc.concat( Array.isArray( val ) ? this.flatDeep( val, d - 1 ) : val ), [] )
            : arr.slice();
    };

    private findInNamespace( object: any, expr: string, ns: string ): any[] {
        if ( expr === "" ) return object;
        const prefixReg = '^[/]{1,2}'
        const matchSlash = expr.match( prefixReg )[0];
        expr = expr.replace( matchSlash, '' );

        const firstReg = '[^/]*';
        const matchFirst = expr.match( firstReg )[0];
        expr = expr.replace( matchFirst, '' );

        return this.flatDeep(
            xpath.find( object, matchSlash + matchFirst )
                .reduce( ( result, foundObject ) => {
                    if ( foundObject.$ns.uri === ns ) {
                        result.push( this.findInNamespace( foundObject, expr, ns ) )
                    }
                    return result;
                }, [] ), Infinity );
    }

}
