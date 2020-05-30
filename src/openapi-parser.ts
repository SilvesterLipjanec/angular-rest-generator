/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

import { FileManager } from './file-manager';
import { IParser } from './types/generator-types';
import { FILE_EXT } from './types/generator-types';
import * as YAML from 'yaml';
import { OpenAPIV3 } from "openapi-types";
import * as _ from 'lodash';
import { __values } from 'tslib';
import { SpecificationObject, PropertyObject, EnumObject, ParameterObject, MethodObject, HttpMethod, ComponentObject, MediaTypeObject, ResponseObject, SecurityObjects, SecurityObject, PathPart } from './types/specification-types';

export class OpenapiParser implements IParser {

    /**@private specification file manager */
    private specFileManager: FileManager;

    /**@private OpenAPI specification object */
    private specification: OpenAPIV3.Document;

    /**@private norm specification to be used for generator */
    private normSpecification: SpecificationObject;

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
                    if ( this.specFileManager.getExt() === FILE_EXT.JSON ) {
                        this.specification = this.getParsedJson( apiSpecData );
                    } else if ( this.specFileManager.getExt() === FILE_EXT.YAML ) {
                        this.specification = this.getParsedYaml( apiSpecData );
                    }
                    this.initialize();
                    this.parseServers();
                    this.parsePaths();
                    this.normSpecification.security = this.specification.security && this.getParsedSecurityObject( this.specification.security );
                    this.appendSecurityToMethods();
                    this.setUsedApiKeys();
                    resolve( this.normSpecification );
                } );
        } );
    }

    private getParsedJson( rawData: string ) {
        return JSON.parse( rawData );
    }

    private getParsedYaml( rawData: string ) {
        return YAML.parse( rawData );
    }

    private initialize() {
        this.normSpecification = {
            complexTypes: [],
            enumTypes: [],
            parameterTypes: [],
            models: [],
            methods: [],
            security: null
        }
    }

    private appendSecurityToMethods(): void {
        if ( !this.normSpecification.security ) return;
        this.normSpecification.methods.forEach( method => {
            if ( method.security != null ) {
                Object.keys( method.security ).forEach( name => {
                    if ( this.normSpecification.security[name] ) { // mam co poushut
                        method.security[name] = this.pushIfArrNotExist( method.security[name], this.normSpecification.security[name] );
                    }
                } );
            } else {
                method.security = this.normSpecification.security;
            }
        } );
    }

    private setUsedApiKeys(): void {
        this.normSpecification.security = this.normSpecification.security || { usedApiKeys: [] };
        this.normSpecification.security.usedApiKeys = this.normSpecification.security.usedApiKeys || [];
        this.normSpecification.methods.forEach( method => {
            if ( method.security != null ) {
                method.security.headerApiKeySchemas && method.security.headerApiKeySchemas.forEach( schema =>
                    this.pushIfNotExist( this.normSpecification.security.usedApiKeys, schema.name ) );
                method.security.queryApiKeySchemas && method.security.queryApiKeySchemas.forEach( schema =>
                    this.pushIfNotExist( this.normSpecification.security.usedApiKeys, schema.name ) );
            }
        } )
    }

    private pushIfNotExist( target: any[], source: any ) {
        if ( !target.find( obj => obj === source ) ) {
            target.push( source );
        }
    }

    private pushIfArrNotExist( target: any[], source: any[] ): any {
        target = target || [];
        source.forEach( srcObj => {
            if ( !target.find( object => object.name === srcObj.name ) ) {
                target.push( srcObj );
            };
        } )
        return target;
    }

    private getParsedSecurityObject( securityObjectList: OpenAPIV3.SecurityRequirementObject[] ): SecurityObjects {
        let basicHttpSchemas;
        let bearerHttpSchemas;
        let headerApiKeySchemas;
        let queryApiKeySchemas;
        if ( securityObjectList != null ) {
            securityObjectList.forEach( securityObject => {
                _.forEach( securityObject, ( object, name ) => {
                    let securityScheme = this.getSecurityScheme( name );
                    let securityObject: SecurityObject = {
                        scope: object,
                        schemeName: name,
                        name: null
                    };
                    switch ( securityScheme.type ) {
                        case "http":
                            if ( securityScheme.scheme == "basic" ) {
                                basicHttpSchemas = basicHttpSchemas || [];
                                basicHttpSchemas.push( securityObject );
                            } else if ( securityScheme.scheme === "bearer" ) {
                                bearerHttpSchemas = bearerHttpSchemas || [];
                                bearerHttpSchemas.push( securityObject );
                            }
                            break;
                        case "apiKey":
                            securityObject.name = securityScheme.name;
                            if ( securityScheme.in === "header" ) {
                                headerApiKeySchemas = headerApiKeySchemas || [];
                                headerApiKeySchemas.push( securityObject );
                            } else if ( securityScheme.in === "query" ) {
                                queryApiKeySchemas = queryApiKeySchemas || [];
                                queryApiKeySchemas.push( securityObject );
                            }
                            break;
                    }
                } );
            } );
        }
        return {
            basicHttpSchemas: basicHttpSchemas,
            bearerHttpSchemas: bearerHttpSchemas,
            headerApiKeySchemas: headerApiKeySchemas,
            queryApiKeySchemas: queryApiKeySchemas
        }
    }

    private getSecurityScheme( name: string ): OpenAPIV3.SecuritySchemeObject {
        let secSchemes = this.getObjectProperty( ['components', 'securitySchemes'], this.specification );
        if ( !secSchemes || !( name in secSchemes ) ) return null;
        return secSchemes[name];

    }

    private parseServers(): void {
        let endpoints = [];
        if ( 'servers' in this.specification ) {
            endpoints = this.specification.servers.map( server => server.url );
        }
        this.normSpecification['servers'] = endpoints;
    }

    private parsePaths(): void {
        if ( 'paths' in this.specification ) {
            _.forEach( this.specification.paths, ( pathObject, pathName ) => {
                const httpMethods = _.pickBy( pathObject, this.isHttpMehod );
                let methods = this.parseMethods( httpMethods as _.Dictionary<OpenAPIV3.OperationObject> )
                methods.forEach( method => {
                    method.path = this.parsePathParameters( pathName );
                    this.normSpecification.methods.push( method );
                } );
            } );
        }
    }

    private parsePathParameters( path: string ): PathPart[] {
        let resultPath: PathPart[] = [];
        const re = RegExp( '\{(.*?)\}', 'g' ); // match words in curly brackets
        let pathArr = path.split( '/' );
        pathArr.forEach( ( part, id ) => {
            let found = re.exec( part );
            resultPath.push( {
                name: found ? found[1] : part,
                isParam: found ? true : false,
                isLast: id === pathArr.length - 1
            } );
        } );

        return resultPath;
    }

    private parseMethods( methods: _.Dictionary<OpenAPIV3.OperationObject> ): MethodObject[] {
        return _.map( methods, ( methodObject, methodName ): MethodObject => {
            let responses: ResponseObject[];
            let parsedParameters: ParameterObject[];
            let requestBodies: MediaTypeObject[];
            const paramTypeName = methodObject.operationId;
            let successResponse: ResponseObject;
            let methodSecurity: SecurityObjects;
            let hasSuccessResponse = false;

            if ( 'parameters' in methodObject ) {
                parsedParameters = this.parseParameters( methodObject.parameters );
                let found = this.normSpecification.parameterTypes.find( type =>
                    type.name?.toLowerCase() === paramTypeName?.toLowerCase() );
                if ( !found ) {
                    this.normSpecification.parameterTypes.push( {
                        name: paramTypeName,
                        properties: parsedParameters
                    } );
                }
            }
            if ( 'requestBody' in methodObject ) {
                let requestBody = this.getComponentObject<OpenAPIV3.RequestBodyObject>( methodObject.requestBody, paramTypeName );
                requestBodies = this.getParsedMediaTypeObject( requestBody.component, requestBody.name );
            }

            if ( 'responses' in methodObject ) {
                responses = _.map( methodObject.responses, ( responseObject, responseCode ): ResponseObject => {
                    let responseComponent = this.getComponentObject<OpenAPIV3.ResponseObject>( responseObject, paramTypeName );
                    return {
                        content: this.getParsedMediaTypeObject( responseComponent.component, responseComponent.name ),
                        code: responseCode,
                        description: responseComponent.component.description,
                    }
                } );
            }


            methodSecurity = this.getParsedSecurityObject( methodObject.security );
            let pathParams = this.getFilteredParamsOrNull( parsedParameters, 'path' );
            let queryParams = this.getFilteredParamsOrNull( parsedParameters, 'query' );
            let headerParams = this.getFilteredParamsOrNull( parsedParameters, 'header' );
            let cookieParams = this.getFilteredParamsOrNull( parsedParameters, 'cookie' );
            let successId = responses.findIndex( response => response.code === "200" );

            if ( successId === -1 ) {
                successResponse = this.getDefaultSuccessResponse( responses )
            } else {
                hasSuccessResponse = true;
                successResponse = responses[successId];
                responses.splice( successId, 1 );
            }
            return {
                name: methodObject.operationId,
                httpMethod: methodName as HttpMethod,
                pathParameters: pathParams,
                queryParameters: queryParams,
                headerParameters: headerParams,
                cookieParameters: cookieParams,
                parametersType: parsedParameters ? paramTypeName : null,
                requestBodies: requestBodies,
                successResponse: successResponse,
                failResponses: responses,
                path: null,
                hasSuccessResponse: hasSuccessResponse,
                consumeFormData: function () {
                    for ( let key in this.requestBodies ) {
                        if ( this.requestBodies[key].isFormDataMime ) {
                            return true;
                        }
                    }
                    return false;
                },
                hasMediaTypeSetting: function () {
                    return this.hasRequestBody() || this.hasSuccessResponse;
                },
                hasRequestBody: function () {
                    return this.requestBodies != null;
                },
                hasHeaders: function () {
                    return this.hasRequestBody()
                        || this.hasSuccessResponse
                        || this.headerParameters != null
                        || this.security.basicHttpSchemas != null
                        || this.security.bearerHttpSchemas != null
                        || this.security.headerApiKeySchemas != null;
                },
                hasParameters: function () {
                    return this.queryParameters != null
                        || this.security.queryApiKeySchemas != null;
                },
                hasCookieParams: function () {
                    return this.cookieParameters != null;
                },
                security: methodSecurity,
                hasNullBody: function () {
                    switch ( this.httpMethod as HttpMethod ) {
                        case 'post':
                        case 'put':
                        case 'patch':
                            return requestBodies == null;
                        default: return false;
                    }
                },
                hasFailResponses: function () {
                    return this.failResponses != null && this.failResponses.length > 0;
                },

            }
        } );
    }

    private getDefaultSuccessResponse( responses: ResponseObject[] ): ResponseObject {
        let defaultResponse = responses.find( response => response.code === "200" );
        return defaultResponse ? defaultResponse : {
            content: [{ schema: "any" }],
            code: "200"
        };
    }

    private getParsedMediaTypeObject( object: OpenAPIV3.ResponseObject | OpenAPIV3.RequestBodyObject, name: string ): MediaTypeObject[] {
        let result: MediaTypeObject[];
        let defaultSchemaType = 'any';
        _.forEach( object.content, ( mediaTypeObject, mediaType ) => {
            let schemaType;
            if ( this.isXmlMime( mediaType ) ) {
                schemaType = "string";
            } else {
                let componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( mediaTypeObject.schema, name );
                schemaType = this.parseSchemaObject( componentObject.component, componentObject.name ).type;
            }

            result = result || [];
            result.push( {
                mediaType: mediaType,
                isFormDataMime: this.isFormDataMime( mediaType ),
                schema: schemaType ? schemaType : defaultSchemaType,
                required: "required" in object ? object.required : null,
            } );
        } );
        if ( result ) {
            result[result.length - 1].isLast = true;
            return result;
        } else return [{
            schema: defaultSchemaType,
            isLast: true
        }];
    }

    private isFormDataMime( mime: string ): boolean {
        return mime === 'multipart/form-data';
    }

    private isXmlMime( mime: string ): boolean {
        let xmlMimeFormats = ['application/xml', 'text/xml'];
        for ( const format of xmlMimeFormats ) {
            if ( format === mime ) {
                return true;
            }
        }
        return false;
    }

    /** 
    * Piece of code generated by openapi-generator-cli
    * URL: https://www.npmjs.com/package/@openapitools/openapi-generator-cli
    * Check if the given MIME is a JSON MIME.
    * JSON MIME examples:
    *   application/json
    *   application/json; charset=UTF8
    *   APPLICATION/JSON
    *   application/vnd.company+json
    * @param mime - MIME (Multipurpose Internet Mail Extensions)
    * @return True if the given MIME is JSON, false otherwise.
    */
    private isJsonMime( mime: string ): boolean {
        const jsonMime: RegExp = new RegExp( '^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$', 'i' );
        return mime !== null && ( jsonMime.test( mime ) || mime.toLowerCase() === 'application/json-patch+json' );
    }


    private getFilteredParamsOrNull( params: ParameterObject[], by: string ): ParameterObject[] {
        if ( !params ) return null;
        let filtered = params.filter( param => param.in === by );
        return filtered.length === 0 ? null : filtered;

    }

    private getParsedParameter( parameter: OpenAPIV3.ParameterObject ): ParameterObject {
        let prop: PropertyObject;
        if ( 'schema' in parameter ) {
            let componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( parameter.schema, parameter.name );
            prop = this.parseSchemaObject( componentObject.component, componentObject.name );
        }
        return {
            ...prop,
            required: parameter.required,
            style: parameter.style,
            in: parameter.in
        }
    }


    private getComponentObject<T>( inputObject: any, inputName?: string ): ComponentObject<T> {
        let component = inputObject;
        let name = inputName;
        if ( this.isReferenceObject( inputObject ) ) {
            let refPathArr = inputObject.$ref.split( '/' );
            if ( refPathArr[0] === '#' ) {
                refPathArr.shift();
            }
            name = refPathArr[refPathArr.length - 1];
            component = this.getObjectProperty( refPathArr, this.specification );
        }
        return {
            component: component,
            name: name
        }
    }

    private parseParameters( parameters: any ): ParameterObject[] {
        return _.map( parameters, ( parameterObject ): ParameterObject => {
            let componentObject = this.getComponentObject<OpenAPIV3.ParameterObject>( parameterObject );
            return this.getParsedParameter( componentObject.component );
        } );

    }

    private isHttpMehod( value: Object, name: string ): boolean {
        switch ( name ) {
            case 'get':
            case 'put':
            case 'post':
            case 'delete':
            case 'options':
            case 'head':
            case 'patch':
                return true;
            default:
                return false;

        }
    }

    private parseSchemaObjects(): void {
        const schemas = this.getObjectProperty( ['components', 'schemas'], this.specification );

        _.forEach( schemas, ( schemaObject, schemaName ) => {
            const componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( schemaObject, schemaName );
            this.parseSchemaObject( componentObject.component, componentObject.name );
        } );
    }

    private parseTsTypeSchema( schemaObject: OpenAPIV3.SchemaObject, schemaName: string, parentName: string = "" ): PropertyObject {

        let isEnumType: boolean = false;
        let typeName: string;
        if ( this.isSchemaObject( schemaObject ) ) {
            if ( 'enum' in schemaObject ) {
                isEnumType = true;
                typeName = parentName + this.capitalize( schemaName )

                let found = this.normSpecification.enumTypes.find( type =>
                    type.name?.toLowerCase() === typeName?.toLowerCase() );
                if ( !found ) {
                    this.normSpecification.enumTypes.push( {
                        name: typeName,
                        values: this.arrayToObjectArray( schemaObject.enum )
                    } );
                }
            } else {
                typeName = this.getTsDataType( schemaObject.type, schemaObject.format );
            }
        } else {
            typeName = this.getReferenceName( schemaObject );
        }
        return {
            name: schemaName,
            type: typeName,
            required: false,
            isSimple: isEnumType,
            isArray: false
        }
    }

    private parseSchemaObject( schemaObject: OpenAPIV3.SchemaObject, schemaName: string, parentName?: string ): PropertyObject {

        if ( !( 'type' in schemaObject ) || schemaObject.type === "object" ) {
            let parsedProperties: PropertyObject[];

            if ( 'properties' in schemaObject ) {
                parsedProperties = this.getParsedProperties( schemaObject.properties, schemaName );
            }

            if ( 'additionalProperties' in schemaObject ) {
                let additionalProperty;
                if ( schemaObject.additionalProperties === true ) {
                    additionalProperty = {
                        name: "id",
                        type: "any",
                        required: false,
                        isSimple: false,
                        isArray: false
                    }
                } else {
                    let componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( schemaObject.additionalProperties, schemaName );
                    parsedProperties = parsedProperties || [];
                    additionalProperty = this.parseSchemaObject( componentObject.component, componentObject.name, parentName )
                }
                additionalProperty.isAdditional = true;
                parsedProperties.push( additionalProperty );
            }

            if ( 'required' in schemaObject ) {
                schemaObject.required.forEach( name => {
                    let id = parsedProperties.findIndex( property => property.name === name );
                    parsedProperties[id].required = true;
                } );
            }
            let found = this.normSpecification.complexTypes.find( type =>
                type.name?.toLowerCase() === schemaName?.toLowerCase() );
            if ( !found ) {
                this.normSpecification.complexTypes.push( {
                    name: schemaName,
                    properties: parsedProperties
                } );

                this.normSpecification.models.push( {
                    name: schemaName,
                    type: schemaName
                } );
            }

            return {
                name: schemaName,
                type: schemaName,
                required: false,
                isSimple: false,
                isArray: false
            };

        } else if ( schemaObject.type === "array" ) {
            const componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( schemaObject.items, schemaName );
            let res = this.parseSchemaObject( componentObject.component, componentObject.name, parentName );
            res.isArray = true;
            return res;
        } else if ( this.isTsType( schemaObject.type ) ) {

            return this.parseTsTypeSchema( schemaObject, schemaName, parentName );

        }
    }

    private getReferenceName( refObject: OpenAPIV3.ReferenceObject ): string {
        const reRefName = '([^\/]*)$';
        const match = refObject.$ref.match( reRefName );
        return match ? match[0] : refObject.$ref;
    }

    private getParsedProperties( properties: any, parentName: string ): PropertyObject[] {
        return _.map( properties, ( propertyObject, propertyName ): PropertyObject => {
            let componentObject = this.getComponentObject<OpenAPIV3.SchemaObject>( propertyObject, propertyName );
            return this.parseSchemaObject( componentObject.component, componentObject.name, parentName );
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

    private arrayToObjectArray( arr: any[] ): EnumObject[] {
        return arr.map( ( arrItem, index ) => ( {
            value: arrItem,
            last: index === ( arr.length - 1 )
        } ) );
    }

    private isTsType( type: string ): boolean {
        switch ( type ) {
            case 'integer':
            case 'number':
            case 'boolean':
            case 'string':
                return true;
            default:
                return false;
        }
    }


    private getTsDataType( type: string, format: string ): string {
        switch ( type ) {
            case 'integer':
            case 'number':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'string':
                return ( format === 'date' || format === 'date-time' ) ? 'Date' :
                    format === 'binary' ? 'Blob' : 'string';
            default:
                return 'Object';
        }
    }

    private isSchemaObject( schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject ): schema is OpenAPIV3.SchemaObject {
        return !schema.hasOwnProperty( '$ref' );
    }

    private isReferenceObject( object: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject ): object is OpenAPIV3.ReferenceObject {
        return object.hasOwnProperty( '$ref' );
    }

    private capitalize( s ): string {
        if ( typeof s !== 'string' ) return ''
        return s.charAt( 0 ).toUpperCase() + s.slice( 1 )
    }


}
