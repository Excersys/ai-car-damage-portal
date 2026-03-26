"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EzCarRentalInfrastructureStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class EzCarRentalInfrastructureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment } = props;
        // VPC with public and private subnets
        const vpc = new ec2.Vpc(this, 'EzCarRentalVpc', {
            maxAzs: 2,
            cidr: '10.0.0.0/16',
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'public-subnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'private-subnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 28,
                    name: 'isolated-subnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
            enableDnsHostnames: true,
            enableDnsSupport: true,
        });
        // Security Groups
        const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
            vpc,
            description: 'Security group for RDS PostgreSQL instance',
            allowAllOutbound: false,
        });
        const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc,
            description: 'Security group for Lambda functions',
            allowAllOutbound: true,
        });
        // Allow Lambda to connect to RDS
        rdsSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.tcp(5432), 'Allow Lambda functions to connect to PostgreSQL');
        // RDS PostgreSQL Database
        const dbSubnetGroup = new rds.SubnetGroup(this, 'DBSubnetGroup', {
            vpc,
            description: 'Subnet group for EZ Car Rental RDS instance',
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
        });
        const database = new rds.DatabaseInstance(this, 'PostgreSQLDatabase', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            credentials: rds.Credentials.fromGeneratedSecret('postgres', {
                secretName: `${environment}/ezcarrental/db-credentials`,
            }),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [rdsSecurityGroup],
            subnetGroup: dbSubnetGroup,
            databaseName: 'ezcarrental',
            storageEncrypted: true,
            backupRetention: cdk.Duration.days(7),
            deletionProtection: environment === 'production',
            removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // S3 Buckets for file storage
        const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
            bucketName: `ezcarrental-${environment}-images-${this.account}-${this.region}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            lifecycleRules: [
                {
                    id: 'delete-old-versions',
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
            removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        const videosBucket = new s3.Bucket(this, 'VideosBucket', {
            bucketName: `ezcarrental-${environment}-videos-${this.account}-${this.region}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            lifecycleRules: [
                {
                    id: 'transition-to-ia',
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30),
                        },
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(90),
                        },
                    ],
                },
                {
                    id: 'delete-old-versions',
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
            removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
            bucketName: `ezcarrental-${environment}-static-${this.account}-${this.region}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: false,
            removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // AWS Cognito User Pool
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `ezcarrental-${environment}-users`,
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
                username: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
                phoneNumber: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            userPoolClientName: `ezcarrental-${environment}-client`,
            generateSecret: false,
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
            },
        });
        // CloudWatch Log Groups
        const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
            logGroupName: `/aws/apigateway/ezcarrental-${environment}`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
            logGroupName: `/aws/lambda/ezcarrental-${environment}`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // IAM Role for Lambda functions
        const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
            ],
            inlinePolicies: {
                S3Access: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                's3:GetObject',
                                's3:PutObject',
                                's3:DeleteObject',
                                's3:ListBucket',
                            ],
                            resources: [
                                imagesBucket.bucketArn,
                                `${imagesBucket.bucketArn}/*`,
                                videosBucket.bucketArn,
                                `${videosBucket.bucketArn}/*`,
                                staticAssetsBucket.bucketArn,
                                `${staticAssetsBucket.bucketArn}/*`,
                            ],
                        }),
                    ],
                }),
                SecretsManagerAccess: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                'secretsmanager:GetSecretValue',
                            ],
                            resources: [
                                database.secret?.secretArn || '',
                            ],
                        }),
                    ],
                }),
            },
        });
        // Lambda Layer for common dependencies
        const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
            layerVersionName: `ezcarrental-${environment}-common`,
            code: lambda.Code.fromAsset('infrastructure/lambda-layers/common'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            description: 'Common dependencies for EZ Car Rental Lambda functions',
        });
        // API Lambda Functions
        const authLambda = new lambda.Function(this, 'AuthLambda', {
            functionName: `ezcarrental-${environment}-auth`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('infrastructure/lambda/auth'),
            layers: [commonLayer],
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                DATABASE_SECRET_ARN: database.secret?.secretArn || '',
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            role: lambdaExecutionRole,
            logGroup: lambdaLogGroup,
            timeout: cdk.Duration.seconds(30),
        });
        const carsLambda = new lambda.Function(this, 'CarsLambda', {
            functionName: `ezcarrental-${environment}-cars`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('infrastructure/lambda/cars'),
            layers: [commonLayer],
            environment: {
                DATABASE_SECRET_ARN: database.secret?.secretArn || '',
                IMAGES_BUCKET_NAME: imagesBucket.bucketName,
                VIDEOS_BUCKET_NAME: videosBucket.bucketName,
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            role: lambdaExecutionRole,
            logGroup: lambdaLogGroup,
            timeout: cdk.Duration.seconds(30),
        });
        const bookingsLambda = new lambda.Function(this, 'BookingsLambda', {
            functionName: `ezcarrental-${environment}-bookings`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('infrastructure/lambda/bookings'),
            layers: [commonLayer],
            environment: {
                DATABASE_SECRET_ARN: database.secret?.secretArn || '',
            },
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            role: lambdaExecutionRole,
            logGroup: lambdaLogGroup,
            timeout: cdk.Duration.seconds(30),
        });
        // API Gateway
        const api = new apigateway.RestApi(this, 'Api', {
            restApiName: `ezcarrental-${environment}-api`,
            description: 'EZ Car Rental API',
            deployOptions: {
                stageName: environment,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,
                accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
        });
        // Cognito Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: `ezcarrental-${environment}-authorizer`,
        });
        // API Routes
        const authResource = api.root.addResource('auth');
        authResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
        authResource.addMethod('GET', new apigateway.LambdaIntegration(authLambda));
        const carsResource = api.root.addResource('cars');
        carsResource.addMethod('GET', new apigateway.LambdaIntegration(carsLambda));
        carsResource.addMethod('POST', new apigateway.LambdaIntegration(carsLambda), {
            authorizer: cognitoAuthorizer,
        });
        const carResource = carsResource.addResource('{carId}');
        carResource.addMethod('GET', new apigateway.LambdaIntegration(carsLambda));
        carResource.addMethod('PUT', new apigateway.LambdaIntegration(carsLambda), {
            authorizer: cognitoAuthorizer,
        });
        carResource.addMethod('DELETE', new apigateway.LambdaIntegration(carsLambda), {
            authorizer: cognitoAuthorizer,
        });
        const bookingsResource = api.root.addResource('bookings');
        bookingsResource.addMethod('GET', new apigateway.LambdaIntegration(bookingsLambda), {
            authorizer: cognitoAuthorizer,
        });
        bookingsResource.addMethod('POST', new apigateway.LambdaIntegration(bookingsLambda), {
            authorizer: cognitoAuthorizer,
        });
        const bookingResource = bookingsResource.addResource('{bookingId}');
        bookingResource.addMethod('GET', new apigateway.LambdaIntegration(bookingsLambda), {
            authorizer: cognitoAuthorizer,
        });
        bookingResource.addMethod('PUT', new apigateway.LambdaIntegration(bookingsLambda), {
            authorizer: cognitoAuthorizer,
        });
        bookingResource.addMethod('DELETE', new apigateway.LambdaIntegration(bookingsLambda), {
            authorizer: cognitoAuthorizer,
        });
        // Outputs
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'VPC ID',
            exportName: `EzCarRental-${environment}-VpcId`,
        });
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: database.instanceEndpoint.hostname,
            description: 'RDS PostgreSQL endpoint',
            exportName: `EzCarRental-${environment}-DatabaseEndpoint`,
        });
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: database.secret?.secretArn || '',
            description: 'Database credentials secret ARN',
            exportName: `EzCarRental-${environment}-DatabaseSecretArn`,
        });
        new cdk.CfnOutput(this, 'ImagesBucketName', {
            value: imagesBucket.bucketName,
            description: 'S3 bucket for images',
            exportName: `EzCarRental-${environment}-ImagesBucket`,
        });
        new cdk.CfnOutput(this, 'VideosBucketName', {
            value: videosBucket.bucketName,
            description: 'S3 bucket for videos',
            exportName: `EzCarRental-${environment}-VideosBucket`,
        });
        new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
            value: staticAssetsBucket.bucketName,
            description: 'S3 bucket for static assets',
            exportName: `EzCarRental-${environment}-StaticAssetsBucket`,
        });
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: `EzCarRental-${environment}-UserPoolId`,
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: `EzCarRental-${environment}-UserPoolClientId`,
        });
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url,
            description: 'API Gateway endpoint',
            exportName: `EzCarRental-${environment}-ApiEndpoint`,
        });
    }
}
exports.EzCarRentalInfrastructureStack = EzCarRentalInfrastructureStack;
