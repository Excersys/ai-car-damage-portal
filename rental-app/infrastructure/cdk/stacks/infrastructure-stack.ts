import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface EzCarRentalInfrastructureStackProps extends cdk.StackProps {
  environment: string;
}

export class EzCarRentalInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EzCarRentalInfrastructureStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProd = environment === 'production';

    // VPC - Only for production (RDS requirement), removed for dev/staging to minimize IAM policy size
    const vpc = isProd ? new ec2.Vpc(this, 'EzCarRentalVpc', {
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
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1,
    }) : undefined;

    // Security Groups - Only for production
    const lambdaSecurityGroup = vpc ? new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    }) : undefined;

    // RDS Database (Production only - dev/staging use mock data for cost optimization)
    let database: rds.DatabaseInstance | undefined;
    let rdsSecurityGroup: ec2.SecurityGroup | undefined;

    if (isProd && vpc && lambdaSecurityGroup) {
      rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
        vpc,
        description: 'Security group for RDS PostgreSQL instance',
        allowAllOutbound: false,
      });

      rdsSecurityGroup.addIngressRule(
        lambdaSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow Lambda functions to connect to PostgreSQL'
      );

      database = new rds.DatabaseInstance(this, 'PostgreSQLDatabase', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_14,
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        credentials: rds.Credentials.fromGeneratedSecret('postgres', {
          secretName: `ezcarrental-${environment}-db-credentials`,
        }),
        securityGroups: [rdsSecurityGroup!],
        databaseName: 'ezcarrental',
        storageEncrypted: true,
        backupRetention: cdk.Duration.days(7),
        deletionProtection: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
      });
    }

    // S3 Buckets
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `ezcarrental-${environment}-images-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: environment !== 'dev',
      lifecycleRules: environment !== 'dev' ? [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ] : [],
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `ezcarrental-${environment}-static-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: false,
        ignorePublicAcls: true,
        restrictPublicBuckets: false,
      }),
      versioned: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    staticAssetsBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'PublicReadForWebsiteHosting',
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${staticAssetsBucket.bucketArn}/*`],
    }));

    // Cognito
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
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `ezcarrental-${environment}-client`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
    });

    // CloudWatch Log Groups
    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/ezcarrental-${environment}`,
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for Lambda
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Runtime secrets stored in Secrets Manager (not baked into CloudFormation template).
    // Created out-of-band (CLI/console) and referenced by name so synth never touches plaintext.
    const thirdPartySecretName = `acr/${environment}/third-party-keys`;
    const thirdPartySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'ThirdPartySecret',
      thirdPartySecretName,
    );

    thirdPartySecret.grantRead(lambdaExecutionRole);

    // Lambda Layer
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: `ezcarrental-${environment}-common`,
      code: lambda.Code.fromAsset('lambda-layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for EZ Car Rental Lambda functions',
    });

    // Main API Lambda
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      functionName: `ezcarrental-${environment}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
      layers: [commonLayer],
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        DATABASE_SECRET_ARN: database?.secret?.secretArn || '',
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
        STATIC_BUCKET_NAME: staticAssetsBucket.bucketName,
        ENVIRONMENT: environment,
        // Lambda reads actual key values from Secrets Manager at runtime
        THIRD_PARTY_SECRET_NAME: thirdPartySecretName,
        EXPERIAN_BASE_URL: environment === 'dev'
          ? 'https://sandbox.experian.com/api'
          : 'https://api.experian.com',
        STRIPE_API_VERSION: '2023-10-16',
      },
      role: lambdaExecutionRole,
      logGroup: lambdaLogGroup,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `ezcarrental-${environment}-api`,
      description: 'EZ Car Rental API',
      deployOptions: {
        stageName: environment,
        loggingLevel: environment === 'dev' ? apigateway.MethodLoggingLevel.ERROR : apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'dev',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    const apiIntegration = new apigateway.LambdaIntegration(apiLambda);

    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', apiIntegration);

    api.root.addMethod('ANY', apiIntegration);

    // ────────────────────────────────────────────
    // CfnOutputs (unchanged for backward compat)
    // ────────────────────────────────────────────

    if (vpc) {
      new cdk.CfnOutput(this, 'VpcId', {
        value: vpc.vpcId,
        description: 'VPC ID',
        exportName: `EzCarRental-${environment}-VpcId`,
      });
    }

    if (database) {
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
    }

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'S3 bucket for images',
      exportName: `EzCarRental-${environment}-ImagesBucket`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: staticAssetsBucket.bucketName,
      description: 'S3 bucket for static assets',
      exportName: `EzCarRental-${environment}-StaticAssetsBucket`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: staticAssetsBucket.bucketWebsiteUrl,
      description: 'Frontend website URL',
      exportName: `EzCarRental-${environment}-FrontendUrl`,
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

    // ────────────────────────────────────────────
    // SSM Parameters -- machine-readable outputs
    // ────────────────────────────────────────────

    new ssm.StringParameter(this, 'SSMCognitoPoolId', {
      parameterName: `/acr/${environment}/rental/cognito-pool-id`,
      stringValue: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new ssm.StringParameter(this, 'SSMCognitoClientId', {
      parameterName: `/acr/${environment}/rental/cognito-client-id`,
      stringValue: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new ssm.StringParameter(this, 'SSMApiEndpoint', {
      parameterName: `/acr/${environment}/rental/api-endpoint`,
      stringValue: api.url,
      description: 'Rental API Gateway endpoint',
    });

    new ssm.StringParameter(this, 'SSMImagesBucket', {
      parameterName: `/acr/${environment}/rental/images-bucket`,
      stringValue: imagesBucket.bucketName,
      description: 'Rental images S3 bucket',
    });

    new ssm.StringParameter(this, 'SSMStaticBucket', {
      parameterName: `/acr/${environment}/rental/static-bucket`,
      stringValue: staticAssetsBucket.bucketName,
      description: 'Rental static assets S3 bucket',
    });

    new ssm.StringParameter(this, 'SSMFrontendUrl', {
      parameterName: `/acr/${environment}/rental/frontend-url`,
      stringValue: staticAssetsBucket.bucketWebsiteUrl,
      description: 'Frontend website URL',
    });
  }
}
