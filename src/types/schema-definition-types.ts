/*!
 * Angular application generator from OpenAPI and WADL
 * Copyright(c) 2019 - 2020 Silvester Lipjanec
 **/

export interface SchemaDefinitionObject {
    schema?: SchemaObject[];
}

export interface AttributeGroup {
    '$': AttributeGroupAttrObject;
    attribute?: AttributeObject[];
}

export interface AttributeGroupAttrObject {
    name: string;
    ref: string;
}

export interface GroupObject {
    '$': GroupAttrObject;
    sequence?: OrderObject[];
}

export interface GroupAttrObject {
    name: string;
    ref: string;
}
export interface SimpleTypeObject {
    '$': SimpleTypeAttrObject;
    restriction?: RestrictionObject[];
}

export interface RestrictionObject {
    '$': RestrictionAttrObject;
    attribute?: AttributeObject[];
    enumeration?: DataRestrictionObject[];
    minInclusive?: DataRestrictionObject[];
    maxInclusive?: DataRestrictionObject[];
    pattern?: DataRestrictionObject[];
    whiteSpace?: DataRestrictionObject[];
    fractionDigits?: DataRestrictionObject[];
    length?: DataRestrictionObject[];
    maxExclusive?: DataRestrictionObject[];
    maxLength?: DataRestrictionObject[];
    minExclusive?: DataRestrictionObject[];
    minLength?: DataRestrictionObject[];
    totalDigits?: DataRestrictionObject[];
}

export interface DataRestrictionObject {
    '$': DataRestrictionAttrObject;
}

export interface DataRestrictionAttrObject {
    value: string;
}

export interface RestrictionAttrObject {
    base: string;
    name: string;
}

export interface SimpleTypeAttrObject {
    name: string;
}


export interface SchemaObject {
    '$': SchemaAttrObject;
    element?: ElementObject[];
    complexType?: ComplexTypeObject[];
    simpleType?: SimpleTypeObject[];
    group?: GroupObject[];
    attributeGroup?: AttributeGroup[];
}

export interface SchemaAttrObject {
    version: string;
}

export interface ElementObject {
    '$': ElementAttrObject;
    complexType?: ComplexTypeObject[];
}

export interface ElementAttrObject {
    name: ValueObject;
    type: ValueObject;
    minOccurs?: ValueObject;
    maxOccurs?: ValueObject;
    nillable?: ValueObject;
    default?: ValueObject;
    fixed?: ValueObject;
}
export interface ValueObject {
    local: string;
    name: string;
    prefix: string;
    uri: string;
    value: string;
}

export type SchemaDataType = 'xs:string'
    | 'xs:decimal'
    | 'xs:integer'
    | 'xs: boolean'
    | 'xs: date'
    | 'xs: time';

export interface ComplexTypeObject {
    '$': ComplexTypeAttrObject;
    sequence?: OrderObject[];
    all?: OrderObject[];
    choice?: OrderObject[];
    attribute?: AttributeObject[];
    anyAttribute?: [];
    complexContent?: ContentObject[];
    simpleContent?: ContentObject[];
    attributeGroup?: AttributeGroup[];
}

export interface ContentObject {
    extension?: ExtensionObject[];
    restriction?: RestrictionObject[];
}

export interface ExtensionObject {
    '$': ExtensionAttrObject;
    sequence?: OrderObject[];
}

export interface ExtensionAttrObject {
    base: string;
}



export interface ComplexTypeAttrObject {
    name: string;
    mixed: string;
}

export interface OrderObject {
    element?: ElementObject[];
    group?: GroupObject[];
    any?: AnyObject[];
}

export interface AnyObject {

}

export interface AttributeObject {
    '$': AttributeAttrObject;
}

export interface AttributeAttrObject {
    name: string;
    type: string;
    use?: string;
}
