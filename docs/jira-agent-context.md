# JIRA Project Manager Agent Context

## ACR Project Details
- **Project URL**: https://excersys.atlassian.net/jira/software/c/projects/ACR/boards/324
- **Project Key**: ACR
- **Board ID**: 324
- **Project Type**: AI Car Rental Platform

## Exact JIRA CLI Command Formats That Work

### For Creating Epics:
```bash
jira create-task --summary "Epic Name" --description "Epic description with comprehensive details" --type "Epic" --priority "Highest|High|Medium" --estimate "X.X" --start "YYYY-MM-DD" --due "YYYY-MM-DD"
```

### For Creating Tasks:
```bash
jira create-task --summary "Task Name" --description "Task description with comprehensive acceptance criteria" --type "Task" --priority "Highest|High|Medium" --estimate "X.X" --start "YYYY-MM-DD" --due "YYYY-MM-DD" --parent "ACR-XX"
```

## Successfully Created Project Structure

### Epics Created:
- **ACR-85**: AWS Infrastructure Setup (2.5 hours, Aug 4, 2025, Priority: Highest)
- **ACR-86**: Identity Verification Module (3.25 hours, Aug 5, 2025, Priority: High)
- **ACR-87**: AI-Based Damage Detection System (4.0 hours, Aug 6, 2025, Priority: High)
- **ACR-88**: Rental Booking System (3.25 hours, Aug 7, 2025, Priority: High)
- **ACR-89**: Admin Dashboard (1.75 hours, Aug 8, 2025, Priority: Medium)

### Tasks Created:
- **ACR-90**: Core AWS Infrastructure Setup (1.5h, parent: ACR-85)
- **ACR-91**: CI/CD Pipeline Setup (1.0h, parent: ACR-85)
- **ACR-92**: Third-Party SDK Integration & License Verification (1.75h, parent: ACR-86)
- **ACR-93**: Biometric Verification & Credit Check Integration (1.5h, parent: ACR-86)
- **ACR-94**: Camera System Integration & Image Processing Pipeline (2.0h, parent: ACR-87)
- **ACR-95**: AI Model Integration & Damage Analysis Engine (2.0h, parent: ACR-87)
- **ACR-96**: Vehicle Search, Availability & Booking Flow (1.75h, parent: ACR-88)
- **ACR-97**: Payment Integration & Digital Agreement System (1.5h, parent: ACR-88)
- **ACR-98**: Admin Dashboard with Role-Based Access Control (1.75h, parent: ACR-89)

## Project Timeline & Estimates
- **Total Project**: 14.75 hours (with Claude Code 2x acceleration)
- **Original Estimate**: 29.5 hours
- **Development Period**: August 4-8, 2025 (5 working days)
- **Approach**: Claude Code assisted development

## Critical Requirements
1. **Always use time estimates** (not story points)
2. **Always include both start and due dates**
3. **Always link tasks to parent epics** using --parent parameter
4. **Use proper priority levels** (Highest for infrastructure, High for features, Medium for admin)
5. **Include comprehensive descriptions** with detailed acceptance criteria
6. **Never create mock data** - only real JIRA items

## Common Mistakes to Avoid
- DO NOT simulate or mock JIRA responses
- DO NOT forget to set due dates
- DO NOT use story points instead of time estimates
- DO NOT create items without linking tasks to parent epics
- DO NOT use generic descriptions - be specific and detailed

## Time Estimate Guidelines
- Infrastructure tasks: 1.0-1.5 hours each
- Integration tasks: 1.5-2.0 hours each
- Complex AI/ML tasks: 2.0+ hours each
- Admin/UI tasks: 1.75 hours average
- All estimates account for Claude Code 2x development acceleration