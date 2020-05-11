# angular-rest-generator

Generator allows generation of Angular9 TypeScript (via @angular/common/http) modul which include services and data structures to be used for communication with server. 

Allows generation of services and data structures from [OpenAPI](https://www.openapis.org/).
Allows generation of data structures from [WADL](http://www.w3.org/Submission/wadl/).

Features: 
- Request/response representations are handled as interfaces with type aliases
- Enumeration represenations are handled as union types
- Request body serialization with interceptor
- Full support XSD schema types (`xs:string`, `xs:number`, `xs:boolean`, `xs:datetime`, etc.)
- XSD schema enumeration handled as enum
- XSD schema extension handled as object inheritance
- Configuration options provided as [injection tokens](https://angular.io/api/core/InjectionToken) 
- Authorization support: Basic HTTP, Bearer Token, API keys
- Method parameters provided either as single parameters or as object with properties
- Allow retry failed requests
- Error handling based on specification

## Installation

```bash
npm install angular-rest-generator
```

## Generator configuration

Configuration options are provided within configuration file. Configuration file is not compulsory. If configuration file is not specified with `--config` option, default configuration will be used.

### Configuration options
Following options can be used in configuration file in JSON format:
* `apiSpec` (default: `null`): Path to REST API specification file. This is compulsory option only if `--apispec` CLI option was not provided. 
* `outputDir` (default: `"."`): Path to output directory.
* `interfacePrefix` (default: `"I"`): Prefix that is used for interfaces.
* `interfaceSuffix` (default: `""`): Suffix that is used for interfaces.
* `capitalizeTypeName` (default: `true`): Capitalize all interface and custom type names.
* `typePrefix` (default: `""`): Prefix that is used for custom types.
* `typeSuffix` (default: `""`): Suffix that is used for custom types.
* `parameterTypePrefix` (default: `""`): Prefix that is used for types reprezenting objects with method parameters. Option is taken into accout only if `parametersAsObject` is set to `true`. 
* `parameterTypeSuffix` (default: `"Params"`): Suffix that is used for types reprezenting objects with method parameters. Option is taken into accout only if `parametersAsObject` is set to `true`. 
* `moduleName` (default: `"gateway"`): Name that is used for module `<moduleName>Module`.
* `serviceName` (default: `"gateway"`): Name that is used for service `<serviceName>Module`.
* `interceptorName` (default: `"gateway"`): Name that is used for module `<interceptorName>Module`.
* `retryFailedRequest` (default: `null`): Number of retry failed requests.
* `forceGeneration` (default: `false`):
* `parametersAsObject` (default: `false`): Method parameters are provided as object with properties. Data structures to determine object type will be generated along with models.

# Usage

Specification file provided as parameter

```bash
angular-rest-generator --apispec ./apispecification.json
angular-rest-generator --apispec ./apispecification.yaml
angular-rest-generator --apispec ./apispecification.wadl
```

Configuration file provided as parameter. In this case `apiSpec` field has to be provided in configuration file.
```bash
angular-rest-generator --config ./generatorconfig.json
```

Force code regeneration even if specification didn't changed
```bash
angular-rest-generator -f --config ./generatorconfig.json
```

## Generated files
Key within `<key>` tag is replaced with configuration option of same name.

* `config.ts`: Default configuration options
* `<interceptorName>.interceptor.ts`: Interceptor providing serialization
* `<moduleName>.module.ts`: NgModul to define dependency injection providers and needed imports 
* `<serviceName>.service.ts`: Service implements methods to be used for communication with server
* `models.ts`: Data structures

## Generated code configuration

### Default options

In `config.ts` you can specify default configuration options. There is possibility to configure:
* Method configuration (`const methodConfig`). For each method you can specify:
  - `consume` - `Content-type` field in header of HTTP request.
  - `accept` - `Accept` field in header of HTTP request
  - `reportProgress` - Whether this request should be made in a way that exposes progress events.
  - `withCredentials` - Whether this request should be sent with outgoing credentials (cookies).
* API keys (`const apiKeys`) - Specify used API keys
* HTTP Bearer authentication token  (`const bearerToken`) - Token used for HTTP Bearer authentication
* HTTP Basic authentication token  (`const basicToken`) - Token used for HTTP Basic authentication. Representing base64 encoded user ID and password.
* Service root URL (`const apiEndpoint`) - URL to be used for communication with server. You can choose one of available options held in `apiEndpoints` array.

Object `configOptions` held available options for configuration of `methodConfig` fields `consume` and `accept`.

### Change configuration programmatically

Configuration values are provided to service through Injection tokens. If you want to change default configuration value, inject appropriate token into component and forward new value with `next()` method. See example.

Available injection tokens are: 
* `API_ENDPOINT`: type `string`
* `API_BEARER_TOKEN`: type `string`
* `API_BASIC_TOKEN`: type `string` 
* `API_KEYS`: type `ApiKeys` from `configuration.ts` 
* `METHOD_CONFIG`: type `MethodConfig` from `configuration.ts` 

## Example Usage

Import `<modulName>Module` into your NgModul. For example `GatewayModule`:

```ts
import ...
import { GatewayModule } from './gateway.module';

@NgModule({
    imports: [
        ...
        GatewayModule
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
```

Now, you can use `<serviceName>Service` methods. For example `GatewayService`:
```ts
import ...
import { ApiKeys } from './configuration';
import { API_KEYS } from './gateway.module';
import { GatewayService } from './gateway.service';

@Component(...)
export class AppComponent {
    constructor(
        private gateway: GatewayService),
        @Inject( API_KEYS ) private apiKeys$: BehaviorSubject<ApiKeys>
    }
    
    exampleCall() {
        // parameters as object 
        let exampleParameters = {
            param: 1,
            secondParam: 'stringParam'
        }

        //change API KEY programmatically 
        let currentApiKeysConfig = this.apiKeys$.value;     // get current value
        currentApiKeysConfig["MY-API-KEY"] = "newKeyValue"; // fill key with new value
        this.apiKeys$.next( currentApiKeysConfig );         // forward new value

        // call service method
        this.gateway.exampleMethod( exampleParameters )
            .subscribe((response) => {
                // do sth with response
            }, (error: Error) => {
                console.error(error);
            });
    },
}
```


## License

MIT

