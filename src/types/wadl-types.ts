/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

export interface WadlObject {
    application: ApplicationObject[];
}

export interface ApplicationObject {
    doc?: DocObject[];
    grammars?: GrammarsObject[];
    resources?: ResourcesObject[];
    resource_type?: ResourceTypeObject[];
    method?: MethodDefinitionObject[] | MethodReferenceObject[];
    representation?: RepresentationDefinitionObject[][];
    param?: ParamDefinitionObject[];
}
export interface ResourceTypeObject {
    attr: ResourceTypeAttrObject;
    doc?: DocObject[];
    param?: ParamDefinitionObject[] | ParamReferenceObject[];
    method?: MethodDefinitionObject[] | MethodReferenceObject[];
    resource?: ResourceObject[];
}

export interface ResourceTypeAttrObject {
    id: string;
}

export interface DocObject {
    '#text': string;
    attr: DocAttrObject;
}

export interface DocAttrObject {
    lang: string;
    title: string;
}

export interface ApplicationAttrObject {
    xmlns: string;
}

export interface GrammarsObject {
    include?: IncludeObject[];
}
export interface IncludeObject {
    doc?: DocObject[];
    attr: IncludeAttrObject;
}

export interface IncludeAttrObject {
    href: string;
}

export interface ResourceObject {
    doc?: DocObject[];
    param?: ParamDefinitionObject[];
    attr: ResourceAttrObject;
    method?: MethodReferenceObject[] | MethodDefinitionObject[];
    resource?: ResourceObject[];
}

export interface ResourceAttrObject {
    id?: string;
    path?: string;
    type?: string;
    queryType?: string;
}

export interface MethodReferenceObject {
    attr: MethodReferenceAttrObject;
}

export interface MethodDefinitionObject {
    attr: MethodDefinitionAttrObject;
    doc?: DocObject[];
    request: RequestObject[];
    response: ResponseObject[];
}

export interface MethodReferenceAttrObject {
    href: string;
}

export interface MethodDefinitionAttrObject {
    id: string;
    name: string;
}

export interface ResponseObject {
    attr: ResponseAttrObject;
    doc?: DocObject[];
    representation?: RepresentationReferenceObject[] | RepresentationDefinitionObject[];
    param?: ParamDefinitionObject[];
}

export interface ResponseAttrObject {
    status: string;
}

export interface RepresentationReferenceObject {
    attr: RepresentationReferenceAttrObject;
}

export interface RepresentationReferenceAttrObject {
    href: string;
}

export interface RepresentationDefinitionObject {
    attr: RepresentationDefinitionAttrObject;
    doc?: DocObject[];
    param?: RepresentationParamObject[] | ParamDefinitionObject[];
}

export interface RepresentationParamObject {
    mediaType?: string;
    path?: string;
}

export interface RepresentationDefinitionAttrObject {
    id?: string;
    mediaType?: string;
    element?: string;
    profile?: string;

}

export interface ResourcesObject {
    attr: ResourcesAttrObject;
    resource: ResourceObject[];
}

export interface ResourcesAttrObject {
    base: string;
}

export interface RequestObject {
    doc?: DocObject[];
    representation?: RepresentationReferenceObject[] | RepresentationDefinitionObject[];
    param?: ParamDefinitionObject[];
}

export interface ParamDefinitionObject {
    attr: ParamDefinitionAttrObject;
    doc?: DocObject[];
    option?: OptionObject[];
    link?: LinkObject[];
}

export interface ParamDefinitionAttrObject {
    id?: string;
    name: string;
    style: ParamAttrStyle;
    type?: string;
    default?: string;
    path?: string;
    required?: string;
    repeating?: string; // default false = single value
    fixed?: string;
}

export interface ParamReferenceObject {
    attr: ParamReferenceAttrObject;
}

export interface ParamReferenceAttrObject {
    href: string;
}

export type ParamAttrStyle = 'query' // parent elements: resource, resource_type, request, representation
    | 'template' // parent elements: resource
    | 'header' // parent elements: resource, resource_type, request, response
    | 'plain' // parent elements: representation
    | 'matrix'; // parent elements: resource

export interface OptionObject {
    attr: OptionAttrObject;
    doc?: DocObject[];
}

export interface OptionAttrObject {
    value: string;
    mediaType: string;
}

export interface LinkObject {
    doc?: DocObject[];
    attr: LinkAttrObject;
}

export interface LinkAttrObject {
    resource_type?: string;
    rel?: string;
    rev?: string;
}


