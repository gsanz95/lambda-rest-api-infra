import { LambdaIntegration, LambdaIntegrationOptions, MethodLoggingLevel, RestApi, RestApiProps } from '@aws-cdk/aws-apigateway';
import { ManagedPolicy, Role, RoleProps, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Code, Function, FunctionProps, Runtime } from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { Duration } from '@aws-cdk/core';
import { join } from 'path';
import { getProperties } from './util/properties';

export class InfrastructureStack extends cdk.Stack {

  public readonly DURATION_SECONDS: number = 20;
  public api: RestApi;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    let operations = getProperties().get("apis") as String[]

    this.api = this.createBaseRestApi();

    operations.map(api => {
      const lambda = this.createLambdaForOperation(api.toLowerCase());

      this.createApiMethodPaths(api.toUpperCase(), lambda);
    });
  }

  createLambdaForOperation(operation: String): Function {
    const camel_case_operation = operation.charAt(0).toUpperCase() + operation.slice(1)

    const props = {
      runtime: Runtime.JAVA_8_CORRETTO,
      handler: "com.giansanz.rest.handlers." + camel_case_operation + "Handler",
      code: Code.fromAsset(join("D:","Projects","rest","rest-api", "target", "rest-api-0.1.jar")),
      role: this.createLambdaExecutionRole(operation),
      profiling: false,
    } as FunctionProps

    return new Function(this, "rest-api-"+ operation +"-lambda", props)
  }

  createLambdaExecutionRole(operation: String): Role {
    const props = {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      ]
    } as RoleProps

    return new Role(this, "rest-api-"+ operation +"-lambda-role", props)
  }

  createBaseRestApi() {
    const props = {
      restApiName: "rest-api",
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true
      }
    } as RestApiProps

    return new RestApi(this, "rest-api", props)
  }

  createApiMethodPaths(method: string, lambda: Function) {
    const options = {
      proxy: true,
      timeout: Duration.seconds(this.DURATION_SECONDS),
    } as LambdaIntegrationOptions

    const lambda_integration = new LambdaIntegration(lambda, options)

    this.api.root.addMethod(method.toUpperCase(), lambda_integration)
  }
}
