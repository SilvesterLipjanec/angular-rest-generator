/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

import { FileManager } from '../file-manager';
import { SpecificationObject } from './specification-types';

export const FILE_EXT = {
    WADL: '.wadl',
    JSON: '.json',
    YAML: '.yaml',
    LOCK: '-lock'
};

export interface IGeneratorConfig {
    apiSpec?: string;
    outputDir?: string;
    interfaceSuffix?: string;
    interfacePrefix?: string;
    capitalizeTypeName?: boolean;
    typePrefix?: string;
    typeSuffix?: string;
    parameterTypeSuffix?: string;
    parameterTypePrefix?: string;
    moduleName?: string;
    serviceName?: string;
    interceptorName?: string;
    retryFailedRequest?: number;
    forceGeneration?: boolean;
    parametersAsObject?: boolean;
}


export interface IParser {
    getParsed(): Promise<SpecificationObject>;
}
