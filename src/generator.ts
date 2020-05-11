#!/usr/bin/env node
"use strict";

/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

import { FileManager } from './file-manager';
import * as Mustache from 'mustache';
import { SpecificationObject, ModelObject, ComplexType, PropertyObject, EnumType, ParameterType, MethodObject } from './types/specification-types';
import { IGeneratorConfig } from './types/generator-types';
import * as _ from 'lodash';

export class Generator {

    /**@private default generator configuration */
    private generatorConfig: IGeneratorConfig = {
        outputDir: ".",
        interfacePrefix: "I",
        interfaceSuffix: "",
        capitalizeTypeName: true,
        typePrefix: "",
        typeSuffix: "",
        parameterTypePrefix: "",
        parameterTypeSuffix: "Params",
        moduleName: "gateway",
        serviceName: "gateway",
        interceptorName: "gateway",
        parametersAsObject: false
    }
    /**@private norm specification, which generator use for generating output */
    private specification: SpecificationObject;

    /**@private output models filename */
    private modelsOutFile = 'models.ts';

    /**@private output configuration filename */
    private configurationOutFile = 'configuration.ts';

    /**@private modul output filename */
    private modulOutFile: string;

    /**@private service output filename */
    private serviceOutFile: string;

    /**@private interceptor output filename */
    private interceptorOutFile: string;

    /**@private template for models*/
    private modelTemplate = __dirname + '/../src/templates/model-template.mustache';

    /**@private template for modul*/
    private modulTemplate = __dirname + '/../src/templates/modul-template.mustache';

    /**@private  template for services*/
    private serviceTemplate = __dirname + '/../src/templates/service-template.mustache';

    /**@private  template for interceptor*/
    private interceptorTemplate = __dirname + '/../src/templates/interceptor-template.mustache';

    /**@private  template for configuration*/
    private configurationTemplate = __dirname + '/../src/templates/configuration-template.mustache';

    constructor( specification: SpecificationObject, generatorConfig?: IGeneratorConfig ) {
        if ( generatorConfig ) {
            Object.assign( this.generatorConfig, generatorConfig );
        }
        this.specification = specification;
        this.initialize();
    }

    /**
     * Format norm specification based on generator configuration
     * Generate output files based on norm specification
     */
    generate(): void {
        console.log( 'generating starting' );
        this.formatSpecification();
        this.renderModels();
        if ( this.specification.methods ) {
            this.renderModul();
            this.renderService();
            this.renderInterceptor();
            this.renderConfiguration();
        }
        console.log( 'generating done' );
    }

    private initialize(): void {
        this.specification.configuration = this.generatorConfig;
        this.modulOutFile = this.generatorConfig.moduleName.toLowerCase() + '.module.ts';
        this.serviceOutFile = this.generatorConfig.serviceName.toLowerCase() + '.service.ts';
        this.interceptorOutFile = this.generatorConfig.interceptorName.toLowerCase() + '.interceptor.ts';
        this.specification.func = {};
        this.specification.func['capitalize'] = function () {
            return function ( text, render ) {
                return render( text )[0].toUpperCase() + render( text ).substring( 1 );
            }
        };
    }

    private renderModels(): void {
        this.renderFile( this.modelTemplate, this.modelsOutFile );
    }

    private renderModul(): void {
        this.renderFile( this.modulTemplate, this.modulOutFile );
    }

    private renderService(): void {
        this.renderFile( this.serviceTemplate, this.serviceOutFile );
    }

    private renderInterceptor(): void {
        this.renderFile( this.interceptorTemplate, this.interceptorOutFile );
    }

    private renderConfiguration(): void {
        this.renderFile( this.configurationTemplate, this.configurationOutFile );
    }

    private renderFile( templatePath: string, outputFile: string ): void {
        new FileManager( templatePath ).readFile()
            .then( template => {
                const output = Mustache.render( template, this.specification );
                new FileManager( this.generatorConfig.outputDir + '/' + outputFile, output ).writeFile();
            } );
    }

    private formatSpecification(): SpecificationObject {
        _.forEach( this.specification, ( specObject, key ) => {
            switch ( key ) {
                case "models":
                    ( specObject as ModelObject[] ).forEach( obj => {
                        obj.type = this.formatName( obj.type, this.generatorConfig.interfacePrefix, this.generatorConfig.interfaceSuffix );
                        obj.name = this.formatTypeName( obj.name );
                    } );
                    break;
                case "enumTypes":
                    ( specObject as EnumType[] ).forEach( obj => {
                        obj.name = this.formatTypeName( obj.name );
                    } );
                    break;
                case "complexTypes":
                    ( specObject as ComplexType[] ).forEach( obj => {
                        obj.name = this.formatName( obj.name, this.generatorConfig.interfacePrefix, this.generatorConfig.interfaceSuffix );
                        obj.extending = this.formatName( obj.extending, this.generatorConfig.interfacePrefix, this.generatorConfig.interfaceSuffix );
                        obj.properties.forEach( property => {
                            property.type = this.getFormatedPropertyType( property );
                        } );
                    } );
                    break;
                case "parameterTypes":
                    ( specObject as ParameterType[] ).forEach( obj => {
                        obj.name = this.formatName( obj.name, this.generatorConfig.parameterTypePrefix, this.generatorConfig.parameterTypeSuffix );
                        obj.properties.forEach( property => {
                            property.type = this.getFormatedPropertyType( property );
                        } );
                    } )
                    break;
                case "methods":
                    ( specObject as MethodObject[] ).forEach( method => {
                        method.parametersType = this.formatName( method.parametersType, this.generatorConfig.parameterTypePrefix, this.generatorConfig.parameterTypeSuffix );

                        method.requestBodies?.forEach( requestBody =>
                            requestBody.schema = this.formatTypeName( requestBody.schema ) );

                        method.successResponse.content?.forEach( content =>
                            content.schema = this.formatTypeName( content.schema ) );

                        method.failResponses?.forEach( response => {
                            response.content?.forEach( content =>
                                content.schema = this.formatTypeName( content.schema )
                            );
                        } );
                    } );
                    break;
            }

        } );
        return this.specification;
    }


    private formatName( name: string, prefix?: string, suffix?: string ): string {
        if ( !name ) {
            return null;
        }
        if ( !prefix ) {
            prefix = "";
        }
        if ( !suffix ) {
            suffix = "";
        }
        name = this.generatorConfig.capitalizeTypeName ? this.capitalize( name ) : name;
        return prefix + name + suffix;
    }

    private capitalize( s ): string {
        if ( typeof s !== 'string' ) return ''
        return s.charAt( 0 ).toUpperCase() + s.slice( 1 )
    }

    private formatTypeName( type: string ): string {
        return this.isTsType( type ) ? type : this.formatName( type, this.generatorConfig.typePrefix, this.generatorConfig.typeSuffix );
    }

    private isTsType( type: string ): boolean {
        switch ( type ) {
            case 'string':
            case 'boolean':
            case 'number':
            case 'any':
            case 'Date':
            case 'Blob':
            case 'Object':
            case 'File':
            case 'undefined':
            case 'null':
            case 'void':
            case 'tuple':
            case 'never':
                return true;
            default:
                return false;
        }
    }

    private getFormatedPropertyType( typeObj: PropertyObject ): string {
        return this.isTsType( typeObj.type ) ? typeObj.type :
            typeObj.isSimple ?
                this.formatName( typeObj.type, this.generatorConfig.typePrefix ) :
                this.formatName( typeObj.type, this.generatorConfig.interfacePrefix )
    }
}
