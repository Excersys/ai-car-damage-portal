// @vitest-environment node
import { describe, it } from 'vitest'
import * as cdk from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { EzCarRentalInfrastructureStack } from './infrastructure-stack'

function createTestStack(environment = 'dev'): Template {
  const app = new cdk.App()
  const stack = new EzCarRentalInfrastructureStack(app, 'TestStack', {
    environment,
    env: { account: '123456789012', region: 'us-east-1' },
  })
  return Template.fromStack(stack)
}

describe('EzCarRentalInfrastructureStack', () => {
  describe('Cognito UserPool', () => {
    it('includes the custom:role attribute for role-based access control', () => {
      const template = createTestStack()

      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          Match.objectLike({
            Name: 'role',
            AttributeDataType: 'String',
            Mutable: true,
            StringAttributeConstraints: {
              MinLength: '1',
              MaxLength: '20',
            },
          }),
        ]),
      })
    })

    it('retains required standard attributes alongside custom attributes', () => {
      const template = createTestStack()

      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          Match.objectLike({ Name: 'email', Required: true }),
          Match.objectLike({ Name: 'given_name', Required: true }),
          Match.objectLike({ Name: 'family_name', Required: true }),
        ]),
      })
    })

    it('uses DESTROY removal policy in non-production environments', () => {
      const template = createTestStack('dev')

      template.hasResource('AWS::Cognito::UserPool', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
      })
    })

    it('uses RETAIN removal policy in production', () => {
      const template = createTestStack('production')

      template.hasResource('AWS::Cognito::UserPool', {
        UpdateReplacePolicy: 'Retain',
        DeletionPolicy: 'Retain',
      })
    })
  })

  describe('API Gateway', () => {
    it('creates a REST API', () => {
      const template = createTestStack()

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'ezcarrental-dev-api',
      })
    })
  })
})
