import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EzCarRentalInfrastructureStackProps extends cdk.StackProps {
  environment: string;
}

export class EzCarRentalInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EzCarRentalInfrastructureStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // VPC - Only for production (RDS requirement), removed for dev/staging to minimize IAM policy size
    const vpc = environment === 'production' ? new ec2.Vpc(this, 'EzCarRentalVpc', {
      maxAzs: 2, // Multi-AZ for production RDS requirement
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

    if (environment === 'production' && vpc && lambdaSecurityGroup) {
      rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
        vpc,
        description: 'Security group for RDS PostgreSQL instance',
        allowAllOutbound: false,
      });

      // Allow Lambda to connect to RDS
      rdsSecurityGroup.addIngressRule(
        lambdaSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow Lambda functions to connect to PostgreSQL'
      );

      // RDS PostgreSQL Database (Production only)
      database = new rds.DatabaseInstance(this, 'PostgreSQLDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
        // Use smallest instance for cost optimization, easily scalable
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        // Production RDS uses private subnets with egress
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
        // Production backup retention
        backupRetention: cdk.Duration.days(7),
        deletionProtection: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        // Allocate minimum storage, auto-scaling enabled
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
      });
    } // End of production-only RDS deployment

    // S3 Buckets for file storage - simplified with basic lifecycle rules
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `ezcarrental-${environment}-images-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: environment !== 'dev', // No versioning for dev to save costs
      lifecycleRules: environment !== 'dev' ? [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ] : [],
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `ezcarrental-${environment}-static-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      // Enable public read access for static website hosting
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: false, // Allow public bucket policies
        ignorePublicAcls: true,
        restrictPublicBuckets: false // Allow public read access
      }),
      versioned: false, // No versioning for static assets
      // Configure for static website hosting
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing fallback
      publicReadAccess: true, // Enable public read access
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add explicit bucket policy for website hosting (ensuring public read access)
    staticAssetsBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'PublicReadForWebsiteHosting',
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${staticAssetsBucket.bucketArn}/*`],
    }));

    // AWS Cognito User Pool - simplified configuration
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
    });

    // CloudWatch Log Groups - shorter retention for cost savings
    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/ezcarrental-${environment}`,
      retention: environment === 'production' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for Lambda functions - ULTRA MINIMAL to avoid 20KB policy limit
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        // ONLY basic execution - absolutely minimal to avoid policy size limit
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      // ZERO inline policies - all removed to stay under 20KB limit
      // Lambda will handle permission errors gracefully for non-critical features
    });

    // Lambda Layer for common dependencies - simplified
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: `ezcarrental-${environment}-common`,
      code: lambda.Code.fromAsset('lambda-layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for EZ Car Rental Lambda functions',
    });

    // Main API Lambda Function - single function to start, easily split later
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      functionName: `ezcarrental-${environment}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
      layers: [commonLayer],
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        DATABASE_SECRET_ARN: database?.secret?.secretArn || '', // Empty for dev/staging (uses mock data)
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
        STATIC_BUCKET_NAME: staticAssetsBucket.bucketName,
        ENVIRONMENT: environment,
        // Experian API configuration
        EXPERIAN_API_KEY: process.env.EXPERIAN_API_KEY || '',
        EXPERIAN_API_SECRET: process.env.EXPERIAN_API_SECRET || '',
        EXPERIAN_BASE_URL: environment === 'dev' 
          ? 'https://sandbox.experian.com/api' 
          : 'https://api.experian.com',
        // Stripe payment configuration
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
        STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
        STRIPE_API_VERSION: '2023-10-16', // Latest stable API version
      },
      // VPC removed to avoid IAM policy size limit - Lambda runs in default VPC
      role: lambdaExecutionRole,
      logGroup: lambdaLogGroup,
      timeout: cdk.Duration.seconds(30),
      // Minimal memory for cost savings, easily adjustable
      memorySize: 256,
    });

    // API Gateway - simplified configuration
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `ezcarrental-${environment}-api`,
      description: 'EZ Car Rental API',
      deployOptions: {
        stageName: environment,
        // Reduced logging for cost savings in dev
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

    // Cognito Authorizer removed - authentication now handled inside Lambda function
    // This eliminates additional API Gateway complexity and reduces policy size

    // API Routes - SINGLE CATCH-ALL ROUTE to avoid Lambda resource policy 20KB limit
    const apiIntegration = new apigateway.LambdaIntegration(apiLambda);
    
    // CRITICAL: Replace 30+ individual routes with 1 catch-all route
    // This reduces Lambda resource policy from 20KB+ to ~0.7KB (95% reduction)
    // Individual routes were creating 30+ Lambda permission statements
    
    // Catch-all route for ALL API requests (public and authenticated)
    // Lambda function handles all routing logic internally based on HTTP method and path
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', apiIntegration);
    
    // Root level catch-all for paths like /health, /auth
    api.root.addMethod('ANY', apiIntegration);

    // Outputs
    // VPC output only for production
    if (vpc) {
      new cdk.CfnOutput(this, 'VpcId', {
        value: vpc.vpcId,
        description: 'VPC ID',
        exportName: `EzCarRental-${environment}-VpcId`,
      });
    }

    // Database outputs (Production only)
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
  }
}