/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

import { IGeneratorConfig } from './generator-types';

export interface SpecificationObject {
    servers?: string[];
    models?: ModelObject[];
    complexTypes?: ComplexType[];
    enumTypes?: EnumType[];
    parameterTypes?: ParameterType[];
    methods?: MethodObject[];
    configuration?: IGeneratorConfig;
    func?: FunctionObject;
    security?: SecurityObjects;
}

export interface SecurityObjects {
    basicHttpSchemas?: SecurityObject[];
    bearerHttpSchemas?: SecurityObject[];
    headerApiKeySchemas?: SecurityObject[];
    queryApiKeySchemas?: SecurityObject[];
    usedApiKeys?: string[];
}
export interface SecurityObject {
    scope: string[];
    schemeName: string;
    name: string;
}

export interface FunctionObject {
    capitalize?: () => ( text, render ) => string;
}

export interface MethodObject {
    name: string;
    httpMethod: HttpMethod;
    pathParameters: ParameterObject[];
    queryParameters: ParameterObject[];
    headerParameters: ParameterObject[];
    cookieParameters: ParameterObject[];
    parametersType: string;
    requestBodies: MediaTypeObject[];
    successResponse: ResponseObject;
    failResponses: ResponseObject[];
    path: PathPart[];
    security: SecurityObjects;
    hasSuccessResponse: boolean;
    consumeFormData: () => boolean;
    hasRequestBody: () => boolean;
    hasMediaTypeSetting: () => boolean;
    hasNullBody: () => boolean;
    hasHeaders: () => boolean;
    hasParameters: () => boolean;
    hasFailResponses: () => boolean;
    hasCookieParams: () => boolean;
}

export interface PathPart {
    name: string;
    isParam: boolean;
    isLast: boolean;
}

export interface ResponseObject {
    content: MediaTypeObject[];
    code: string;
    description?: string;
}
export interface MediaTypeObject {
    mediaType?: string;
    schema?: string;
    required?: boolean;
    isFormDataMime?: boolean;
    isLast?: boolean;
}

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export interface EnumType {
    name: string;
    values?: EnumObject[];
}

export interface EnumObject {
    value: string;
    last: boolean;
}

export interface ParameterType {
    name: string;
    properties?: ParameterObject[];
}

export interface ComplexType {
    name: string;
    properties?: PropertyObject[];
    extending?: string;
}

export interface ModelObject {
    name: string;
    type?: string;
}

export interface ParameterObject extends PropertyObject {
    required: boolean;
    style: string;
    in: string;
}

export interface PropertyObject {
    name: string;
    isSimple: boolean;
    isArray?: boolean;
    type: string;
    required: boolean;
    isAdditional?: boolean;
}

export interface ComponentObject<T> {
    component: T;
    name: string;
}

